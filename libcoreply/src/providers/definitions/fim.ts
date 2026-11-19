import { z } from "zod";
import type { CoreplyContext } from "../../context";
import { structuredContextProfileSettingsSchema } from "../definition";
import { StatelessProviderInstance } from "../stateless";

const settingsSchema = z.object({
  provider: z.object({
    apiKey: z.string().describe("API key for the FIM provider").meta({ feature: "password" }),
    baseURL: z.url({ protocol: /^https?$/ }).default("https://api.mistral.ai/v1/fim/")
      .describe("Base URL of the Fill-in-the-Middle API endpoint").meta({ isAdvancedSettings: true }),
  }),
  request: z.object({
    model: z.string().describe("Model ID to use for fill-in-the-middle generation"),
    temperature: z.number().min(0).max(1).optional()
      .describe("Controls randomness for fill-in-the-middle generation").meta({ isAdvancedSettings: true }),
  }),
});

export const fimProvider = {
  name: "Mistral Codestral (FIM)",
  description: /* i18n */ "Use a Mistral API key to generate text suggestions with Codestral, a model designed for code completion.",
  stateful: false,
  profileSettingsSchema: structuredContextProfileSettingsSchema,
  settingsSchema,
  settingsDefaults: {
    provider: { baseURL: "https://api.mistral.ai/v1/fim/" },
    request: { model: "codestral-latest", temperature: 1.0 },
  },
  createInstance() {
    return new StatelessProviderInstance((contexts, typing, config) =>
      generateWithFIM(settingsSchema.parse(config), contexts, typing),
    );
  },
};

// ** Updated to use contexts and currentTyping instead of typingInfo
export async function generateWithFIM(
  settings: z.output<typeof settingsSchema>,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  let baseURL = settings.provider.baseURL;
  if (!baseURL.endsWith("/")) {
    baseURL += "/";
  }

  // Build FIM format from contexts
  const chatContexts = contexts.filter((c) => c.type === "chat");
  let pastMessagesFIM = "";
  for (const context of chatContexts) {
    // ** Fixed: use context directly as it's already a ChatContext after filtering
    if (context.data.turns) {
      for (const turn of context.data.turns) {
        for (const message of turn.messages) {
          const prefix = turn.userSent ? "send_message(" : "mock_received(";
          pastMessagesFIM += `${prefix}"${message.body.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")\n`;
        }
      }
    }
  }

  const response = await fetch(`${baseURL}completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.request.model,
      temperature: settings.request.temperature,
      top_p: 1.0,
      max_tokens: 100,
      stream: false,
      stop: '")',
      suffix: '")',
      prompt:
        "# Mocking a texting conversation. Messages never repeat. send_message() sends a message. mock_received() means receiving a message from others.\n# Start of Chat History\n" +
        pastMessagesFIM +
        '\n# Craft a new text\nsend_message("' +
        currentTyping.replace(/\s+/g, " "),
    }),
  });

  if (!response.ok) {
    throw new Error(`FIM request failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const completionText = json.choices?.[0]?.message?.content ?? "";
  return `${currentTyping.replace(/\s+/g, " ")}${completionText}`.trim();
}
