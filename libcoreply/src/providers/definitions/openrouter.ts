import { createOpenRouter } from "@openrouter/ai-sdk-provider";
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
  apiKey: z.string().describe("OpenRouter API key").meta({ feature: "password" }),
  baseURL: z.httpUrl().optional().describe("Custom OpenRouter API base URL (optional)").meta({ isAdvancedSettings: true }),
  appName: z.string().default("Coreply").meta({ enabled: false, isAdvancedSettings: true }),
  appUrl: z.string().default("https://coreply.app").meta({ enabled: false, isAdvancedSettings: true }),
}), createProviderOptionsSchema('Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"openrouter": {...}}'));

const config = {
  name: "OpenRouter",
  settingsSchema,
  settingsDefaults: {
    provider: { appName: "Coreply", appUrl: "https://coreply.app" },
    generateText: { ...generateTextDefaults },
    providerOptions: '{"openrouter": {"reasoning": {"enabled": false, "effort": "none"}}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createOpenRouter(settings.provider)(settings.model);
  },
};

export const openrouterProvider = defineStatelessAIProvider(config);
export const openrouterStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: z.object({
    ...settingsSchema.omit({ generateText: true, providerOptions: true }).shape,
    sessionAffinityHeader: z.literal("x-session-id")
      .describe("HTTP header used to route related requests to the same provider")
      .meta({ enabled: false, isAdvancedSettings: true }),
    generateText: createStatefulGenerateTextSchema(),
    providerOptions: settingsSchema.shape.providerOptions,
  }),
  settingsDefaults: { ...config.settingsDefaults, sessionAffinityHeader: "x-session-id", generateText: statefulGenerateTextDefaults },
});
