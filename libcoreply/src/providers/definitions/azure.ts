import { createAzure } from "@ai-sdk/azure";
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
  resourceName: z.string().optional().describe("Azure OpenAI resource name, used when base URL is not provided"),
  baseURL: z.httpUrl().optional().describe("Full Azure OpenAI base URL (optional)"),
  apiKey: z.string().optional().describe("Azure OpenAI API key").meta({ feature: "password" }),
  apiVersion: z.string().optional().describe("Azure OpenAI API version to use for requests"),
}), createProviderOptionsSchema());

const config = {
  name: "Azure",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"azure": {"reasoningEffort": "none"}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createAzure(settings.provider)(settings.model);
  },
};

export const azureProvider = defineStatelessAIProvider(config);
export const azureStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
