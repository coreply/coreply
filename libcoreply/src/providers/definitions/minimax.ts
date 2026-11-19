import { createMiniMax } from "@ai-sdk/minimax";
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
  apiKey: z.string().describe("MiniMax API key").meta({ feature: "password" }),
  baseURL: z.url({ protocol: /^https?$/ }).optional().describe("Custom MiniMax API base URL (optional)").meta({ isAdvancedSettings: true }),
}), createProviderOptionsSchema('Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"minimax": {...}}'));

const config = {
  name: "MiniMax",
  description: /* i18n */ "Use Coreply with a MiniMax API key.",
  deprecatedDescription: /* i18n */ "Use Coreply with a MiniMax API key. Use the new MiniMax provider instead.",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"minimax": {"thinking": {"type": "disabled"}}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createMiniMax(settings.provider)(settings.model);
  },
};

export const minimaxProvider = defineStatelessAIProvider(config);
export const minimaxStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
