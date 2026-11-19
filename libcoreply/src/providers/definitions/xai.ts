import { createXai } from "@ai-sdk/xai";
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
  apiKey: z.string().describe("xAI API key").meta({ feature: "password" }),
  baseURL: z.url({ protocol: /^https?$/ }).optional().describe("Custom xAI API base URL (optional)").meta({ isAdvancedSettings: true }),
}), createProviderOptionsSchema('Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"xai": {...}}'));

const config = {
  name: "xAI",
  description: /* i18n */ "Use Coreply with an xAI API key.",
  deprecatedDescription: /* i18n */ "Use Coreply with an xAI API key. Use the new xAI provider instead.",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"xai": {"reasoningEffort": "none"}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createXai(settings.provider)(settings.model);
  },
};

export const xaiProvider = defineStatelessAIProvider(config);
export const xaiStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
