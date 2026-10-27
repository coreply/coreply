import { createGoogle } from "@ai-sdk/google";
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
  apiKey: z.string().describe("Google AI API key").meta({ feature: "password" }),
  baseURL: z.httpUrl().optional().describe("Custom Google AI API base URL (optional)"),
}), createProviderOptionsSchema('Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"google": {...}}'));

const config = {
  name: "Google (Gemini API)",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"google": {"thinkingConfig": {"thinkingLevel": "minimal"}}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createGoogle(settings.provider)(settings.model);
  },
};

export const googleProvider = defineStatelessAIProvider(config);
export const googleStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
