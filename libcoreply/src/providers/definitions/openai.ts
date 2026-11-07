import { createOpenAI } from "@ai-sdk/openai";
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
  apiKey: z.string().describe("OpenAI API key").meta({ feature: "password" }),
  baseURL: z.httpUrl().optional().describe("Custom API base URL for OpenAI-compatible routing (optional)").meta({ isAdvancedSettings: true }),
  organization: z.string().optional().describe("OpenAI organization ID (optional)").meta({ isAdvancedSettings: true }),
  project: z.string().optional().describe("OpenAI project ID (optional)").meta({ isAdvancedSettings: true }),
}), createProviderOptionsSchema());

const config = {
  name: "OpenAI",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"openai": {"reasoningEffort": "none"}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createOpenAI(settings.provider)(settings.model);
  },
};

export const openaiProvider = defineStatelessAIProvider(config);
export const openaiStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
