import { Hono } from "hono";
import { Autumn } from "autumn-js";
import type { User } from "better-auth";
import type { ExecutionContext } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { HTTPException } from "hono/http-exception";
import {
  createProviderInstance,
  deserializeContext,
  generateGenericProfile,
  providerDefinitions,
} from "libcoreply";
import type { ProviderInstanceOptions } from "libcoreply";
import {
  cloudSuggestionInputSchema,
  cloudSuggestSchema,
  type CloudResponse,
} from "libcoreply/src/providers/cloud-protocol";
import { z } from "zod";
import { auth } from "./auth";
import { featureId } from "./billing";
import { cloudOrigins } from "./origins";

const billingProviders = {
  openaiStateful: "openai",
  openaiCompatibleStateful: "custom",
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
    "openaiStateful",
    "openaiCompatibleStateful",
    "openrouterStateful",
    "azureStateful",
    "xaiStateful",
    "mistralStateful",
    "groqStateful",
    "googleStateful",
    "googleVertexStateful",
    "minimaxStateful",
  ]),
  providerConfig: z.record(z.string(), z.unknown()),
});

function createSessionRuntime(env: Env) {
  const config = settingsSchema.parse(JSON.parse(env.COREPLY_CLOUD_SETTINGS));
  const settings = providerDefinitions[config.providerId].settingsSchema.parse(
    config.providerConfig,
  );
  return {
    provider: createProviderInstance(config.providerId),
    settings,
    modelId: `${billingProviders[config.providerId]}/${settings.model}`,
    autumn: new Autumn({
      secretKey: env.AUTUMN_SECRET_KEY,
      xApiVersion: "2.3.0",
    }),
    profile: generateGenericProfile("coreply-cloud", "Coreply Cloud"),
  };
}

async function trackModelResponse(
  autumn: Autumn,
  customerId: string,
  modelId: string,
  response: Parameters<
    NonNullable<ProviderInstanceOptions["onModelResponse"]>
  >[0],
  generationId: string,
  attempt: number,
) {
  const { inputTokenDetails, outputTokenDetails } = response.usage;
  // Totals include cached input and reasoning. Autumn expects separate pools.
  if (
    inputTokenDetails.noCacheTokens === undefined ||
    outputTokenDetails.textTokens === undefined
  ) {
    throw new Error(
      "The model did not report separate input and text-output token usage.",
    );
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
  console.info("Cloud token usage accepted", {
    generationId,
    attempt,
    modelId,
    inputTokens: inputTokenDetails.noCacheTokens,
    outputTokens: outputTokenDetails.textTokens,
    cacheReadTokens: inputTokenDetails.cacheReadTokens,
    cacheWriteTokens: inputTokenDetails.cacheWriteTokens,
    reasoningTokens: outputTokenDetails.reasoningTokens,
  });
}

function createSuggestionHandler(env: Env, ctx: ExecutionContext, user: User) {
  let runtime: ReturnType<typeof createSessionRuntime> | undefined;
  let accessCheck: Promise<void> | undefined;

  async function generate(input: z.infer<typeof cloudSuggestionInputSchema>) {
    const generationId = crypto.randomUUID();
    let attempt = 0;
    try {
      runtime ??= createSessionRuntime(env);
      const { autumn, provider, settings, modelId, profile } = runtime;
      accessCheck ??= (async () => {
        // AI credits are dollars, so require less than $1 of remaining usage.
        const access = await autumn.check({
          customerId: user.id,
          featureId,
          requiredBalance: 0.0001,
        });
        if (!access.allowed) {
          throw new HTTPException(403, {
            message: "Your usage limit has been reached.",
          });
        }
      })();
      await accessCheck;
      // await autumn.customers.getOrCreate({
      //   customerId: user.id,
      //   name: user.name,
      //   email: user.email,
      // });
      // // AI credits are dollars, so the default required balance of 1 would
      // // reject customers with less than $1 even when they have usage left.
      // const access = await autumn.check({
      //   customerId: user.id,
      //   featureId,
      //   requiredBalance: 0.0001,
      // });
      // if (!access.allowed) {
      //   throw new HTTPException(403, {
      //     message: "Your usage limit has been reached.",
      //   });
      // }
      const onModelResponse: ProviderInstanceOptions["onModelResponse"] = (response) => {
        const tracking = trackModelResponse(
          autumn,
          user.id,
          modelId,
          response,
          generationId,
          ++attempt,
        ).catch((error: unknown) => {
          console.error("Cloud token tracking failed", {
            generationId,
            attempt,
            modelId,
            error: error instanceof Error ? error.name : "UnknownError",
          });
        });
        ctx.waitUntil(tracking);
      };
      const contexts = input.contexts.map((context) =>
        deserializeContext(context, profile),
      );
      const completion = await provider.request(
        contexts,
        input.typing,
        settings,
        { onModelResponse },
      );
      console.info("Cloud suggestion completed", {
        generationId,
        attempts: attempt,
      });
      return completion;
    } catch (error) {
      console.error("Cloud suggestion failed", {
        generationId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
      // Never expose provider errors, settings, credentials, or prompt content.
      if (error instanceof HTTPException) throw error;
      throw new Error("Couldn't generate a suggestion. Please try again.");
    }
  }

  return generate;
}

export const suggestionWebSocket = new Hono<{
  Bindings: Env;
  Variables: { session: typeof auth.$Infer.Session; connectionId: string };
}>()
  .use("*", async (c, next) => {
    const connectionId = crypto.randomUUID();
    c.set("connectionId", connectionId);
    const origin = c.req.header("Origin");
    const cookie = c.req.header("Cookie");
    console.info("Cloud WebSocket handshake received", {
      connectionId,
      origin,
      cookieHeaderPresent: cookie !== undefined,
      cookieNames: cookie
        ?.split(";")
        .map((entry) => entry.split("=", 1)[0].trim()),
    });
    if (!origin || !cloudOrigins.includes(origin)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (
      c.req.method !== "GET" ||
      c.req.header("Upgrade")?.toLowerCase() !== "websocket"
    ) {
      return c.json({ error: "A WebSocket upgrade is required." }, 426);
    }
    const protocols = c.req
      .header("Sec-WebSocket-Protocol")
      ?.split(",")
      .map((value) => value.trim());
    if (
      !protocols ||
      protocols.length !== 2 ||
      protocols[0] !== "coreply.token" ||
      !/^[a-zA-Z0-9_-]{32}$/.test(protocols[1])
    ) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    try {
      const session = await auth.api.verifyOneTimeToken({
        body: { token: protocols[1] },
      });
      c.set("session", session);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
    if (c.res.status === 101)
      c.res.headers.set("Sec-WebSocket-Protocol", "coreply.token");
    console.info("Cloud WebSocket handshake response", {
      connectionId,
      status: c.res.status,
    });
  })
  .get(
    "/",
    upgradeWebSocket((c) => {
      const connectionId = c.get("connectionId");
      // Capture identity at the token-authenticated handshake. Open sockets do
      // not reauthenticate or change identity when the browser's session changes.
      const user = c.get("session").user;
      const suggest = createSuggestionHandler(c.env, c.executionCtx, user);
      const pendingIds = new Set<string>();
      let closed = false;
      return {
        onMessage(event, ws) {
          if (closed) return;
          if (typeof event.data !== "string") {
            closed = true;
            ws.close(1008, "Invalid message type");
            return;
          }
          let request;
          try {
            request = cloudSuggestSchema.parse(JSON.parse(event.data));
          } catch {
            closed = true;
            ws.close(1008, "Invalid suggestion request");
            return;
          }
          if (pendingIds.has(request.id)) {
            closed = true;
            ws.close(1008, "Duplicate request");
            return;
          }
          pendingIds.add(request.id);
          const send = (response: CloudResponse) => {
            if (!closed && ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify(response));
          };
          const task = (async () => {
            try {
              const completion = await suggest({
                contexts: request.contexts,
                typing: request.typing,
              });
              send({ type: "completion", id: request.id, completion });
            } catch (error) {
              console.error("Cloud WebSocket suggestion failed", {
                connectionId,
                requestId: request.id,
              });
              send({
                type: "error",
                id: request.id,
                message:
                  error instanceof Error
                    ? error.message
                    : "Couldn't generate a suggestion. Please try again.",
              });
            } finally {
              pendingIds.delete(request.id);
            }
          })().catch(() => {
            closed = true;
            ws.close(1011, "Connection failed");
          });
          c.executionCtx.waitUntil(task);
        },
        onClose(event) {
          closed = true;
          pendingIds.clear();
          console.info("Cloud WebSocket closed", {
            connectionId,
            code: event.code,
          });
        },
        onError() {
          closed = true;
          pendingIds.clear();
          console.warn("Cloud WebSocket transport error", { connectionId });
        },
      };
    }),
  )
  .onError((error, c) => {
    if (error instanceof HTTPException)
      return c.json({ error: error.message }, error.status);
    console.error("Cloud WebSocket connection failed", {
      connectionId: c.get("connectionId"),
      error: error.name,
    });
    return c.json(
      { error: "Coreply Cloud is unavailable. Please try again." },
      503,
    );
  });
