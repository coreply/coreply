import { DurableObject } from "cloudflare:workers";
import { Autumn } from "autumn-js";
import type { User } from "better-auth";
import { HTTPException } from "hono/http-exception";
import {
  createProviderInstance,
  deserializeContext,
  generateGenericProfile,
  providerDefinitions,
} from "libcoreply";
import type { ProviderInstanceOptions } from "libcoreply";
import { cloudSuggestionInputSchema } from "libcoreply/src/providers/cloud-protocol";
import { z } from "zod";
import { customerUsage, featureId } from "./billing";

const billingProviders = {
  openaiStateful: "openai",
  openrouterStateful: "openrouter",
  azureStateful: "azure",
  xaiStateful: "xai",
  mistralStateful: "mistral",
  groqStateful: "groq",
  googleStateful: "google",
  googleVertexStateful: "google-vertex",
  minimaxStateful: "minimax",
} as const;

const settingsSchema = z.object({
  providerId: z.enum([
    "openaiStateful", "openrouterStateful", "azureStateful", "xaiStateful",
    "mistralStateful", "groqStateful", "googleStateful", "googleVertexStateful",
    "minimaxStateful",
  ]),
  providerConfig: z.record(z.string(), z.unknown()),
});

function createSessionRuntime(env: Env) {
  const config = settingsSchema.parse(JSON.parse(env.COREPLY_CLOUD_SETTINGS));
  const settings = providerDefinitions[config.providerId].settingsSchema.parse(config.providerConfig);
  return {
    provider: createProviderInstance(config.providerId),
    settings,
    modelId: `${billingProviders[config.providerId]}/${settings.model}`,
    autumn: new Autumn({ secretKey: env.AUTUMN_SECRET_KEY, xApiVersion: "2.3.0" }),
    profile: generateGenericProfile("coreply-cloud", "Coreply Cloud"),
  };
}

async function trackModelResponse(
  autumn: Autumn,
  customerId: string,
  modelId: string,
  response: Parameters<NonNullable<ProviderInstanceOptions["onModelResponse"]>>[0],
  generationId: string,
  attempt: number,
) {
  const { inputTokenDetails, outputTokenDetails } = response.usage;
  // Totals include cached input and reasoning. Autumn expects separate pools.
  if (inputTokenDetails.noCacheTokens === undefined || outputTokenDetails.textTokens === undefined) {
    throw new Error("The model did not report separate input and text-output token usage.");
  }
  await autumn.trackTokens({
    customerId,
    featureId,
    modelId,
    inputTokens: inputTokenDetails.noCacheTokens,
    outputTokens: outputTokenDetails.textTokens,
    cacheReadTokens: inputTokenDetails.cacheReadTokens,
    cacheWriteTokens: inputTokenDetails.cacheWriteTokens,
    reasoningTokens: outputTokenDetails.reasoningTokens,
    properties: { generationId, attempt },
    async: true,
  });
  console.info("Cloud token usage accepted", { generationId, attempt, modelId });
}

// One object per authenticated user. No storage or alarms: eviction and
// deployment intentionally discard the provider's conversation history.
export class SuggestionSession extends DurableObject<Env> {
  private runtime: ReturnType<typeof createSessionRuntime> | undefined;
  private queue = Promise.resolve();

  async suggest(user: User, input: z.infer<typeof cloudSuggestionInputSchema>): Promise<string> {
    // RPCs can interleave at awaits. Serialize both transports explicitly and
    // recover the queue after a failure so subsequent requests still run.
    const result = this.queue.then(() => this.generate(user, input));
    this.queue = result.then(() => {}, () => {});
    return result;
  }

  private async generate(user: User, input: z.infer<typeof cloudSuggestionInputSchema>) {
    const generationId = crypto.randomUUID();
    let attempt = 0;
    try {
      this.runtime ??= createSessionRuntime(this.env);
      const { autumn, provider, settings, modelId, profile } = this.runtime;
      const customer = await autumn.customers.getOrCreate({
        customerId: user.id,
        name: user.name,
        email: user.email,
      });
      const usage = customerUsage(customer);
      if (usage.monthly.remaining <= 0 || usage.daily.remaining <= 0) {
        throw new HTTPException(403, { message: "Your usage limit has been reached." });
      }
      provider.onModelResponse = (response) => {
        const tracking = trackModelResponse(
          autumn, user.id, modelId, response, generationId, ++attempt,
        ).catch((error: unknown) => {
          console.error("Cloud token tracking failed", {
            generationId,
            attempt,
            modelId,
            error: error instanceof Error ? error.name : "UnknownError",
          });
        });
        this.ctx.waitUntil(tracking);
      };
      const contexts = input.contexts.map((context) => deserializeContext(context, profile));
      const completion = await provider.request(contexts, input.typing, settings);
      console.info("Cloud suggestion completed", { generationId, attempts: attempt });
      return completion;
    } catch (error) {
      console.error("Cloud suggestion failed", {
        generationId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
      // RPC forwards these messages to the Worker. Never expose provider errors,
      // settings, credentials, or prompt content to the client.
      if (error instanceof HTTPException) throw new Error(error.message);
      throw new Error("Couldn't generate a suggestion. Please try again.");
    }
  }
}
