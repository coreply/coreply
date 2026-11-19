import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { defineStatelessAIProvider, defineStatefulAIProvider } from "../ai-definition";
import {
  createAISettingsSchema,
  createProviderOptionsSchema,
  createStatefulGenerateTextSchema,
  generateTextDefaults,
  statefulGenerateTextDefaults,
} from "../settings";

const settingsSchema = createAISettingsSchema(z.object({
  apiKey: z.string().describe("Groq API key").meta({ feature: "password" }),
  baseURL: z.url({ protocol: /^https?$/ }).optional().describe("Custom Groq API base URL (optional)").meta({ isAdvancedSettings: true }),
}), createProviderOptionsSchema('Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"groq": {...}}'));

const config = {
  name: "Groq",
  description: /* i18n */ "Use Coreply with a Groq API key.",
  deprecatedDescription: /* i18n */ "Use Coreply with a Groq API key. Use the new Groq provider instead.",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"groq": {"reasoningEffort": "none"}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createGroq(settings.provider)(settings.model);
  },
};

export const groqProvider = defineStatelessAIProvider(config);
export const groqStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
