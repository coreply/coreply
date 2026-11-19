import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import {
  defineStatelessAIProvider,
  defineStatefulAIProvider,
} from "../ai-definition";
import {
  createGenerateTextSchema,
  createProviderOptionsSchema,
  createStatefulGenerateTextSchema,
  generateTextDefaults,
  statefulGenerateTextDefaults,
} from "../settings";

const settingsSchema = z.object({
  name: z
    .string()
    .default("openAICompatible")
    .describe("Provider namespace used for providerOptions"),
  model: z
    .string()
    .describe("Model ID to use for text generation"),
  provider: z.object({
    apiKey: z
      .string()
      .describe("API key for the OpenAI-compatible provider")
      .meta({ feature: "password" }),
    baseURL: z
      .url({ protocol: /^https?$/ })
      .describe("Base URL of the OpenAI-compatible API endpoint"),
  }),
  generateText: createGenerateTextSchema(),
  providerOptions: createProviderOptionsSchema(
    'Raw JSON object passed directly to AI SDK providerOptions. Use the same namespace as the "name" field, for example {"openAICompatible": {...}}',
  ),
});

const config = {
  name: "OpenAI Compatible",
  description: /* i18n */ "Use Coreply with an OpenAI-compatible API endpoint and API key.",
  deprecatedDescription: /* i18n */ "Use an OpenAI-compatible API. Use the new OpenAI Compatible provider instead.",
  settingsSchema,
  settingsDefaults: {
    name: "openAICompatible",
    provider: { baseURL: "https://api.openai.com/v1" },
    generateText: { ...generateTextDefaults },
    providerOptions: '{"openAICompatible": {"reasoningEffort": "none"}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createOpenAICompatible({
      ...settings.provider,
      name: settings.name,
    })(settings.model);
  },
};

export const openaiCompatibleProvider = defineStatelessAIProvider(config);
export const openaiCompatibleStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: z.object({
    ...settingsSchema.omit({ generateText: true, providerOptions: true }).shape,
    generateText: createStatefulGenerateTextSchema(),
    providerOptions: settingsSchema.shape.providerOptions,
    sessionAffinityHeader: z
      .string()
      .optional()
      .describe(
        "HTTP header used to route related requests to the same provider",
      )
      .meta({ isAdvancedSettings: true }),
  }),
  settingsDefaults: {
    ...config.settingsDefaults,
    generateText: statefulGenerateTextDefaults,
  },
});
