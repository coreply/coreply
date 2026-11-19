import { createMistral } from "@ai-sdk/mistral";
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
  apiKey: z.string().describe("Mistral API key").meta({ feature: "password" }),
  baseURL: z.url({ protocol: /^https?$/ }).optional().describe("Custom Mistral API base URL (optional)").meta({ isAdvancedSettings: true }),
}), createProviderOptionsSchema('Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"mistral": {...}}'));

const config = {
  name: "Mistral",
  description: /* i18n */ "Use Coreply with a Mistral API key.",
  deprecatedDescription: /* i18n */ "Use Coreply with a Mistral API key. Use the new Mistral provider instead.",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: undefined,
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createMistral(settings.provider)(settings.model);
  },
};

export const mistralProvider = defineStatelessAIProvider(config);
export const mistralStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
