import { createGateway } from "ai";
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
  apiKey: z.string().describe("AI Gateway API key or Vercel access token").meta({ feature: "password" }),
  baseURL: z.url({ protocol: /^https?$/ }).optional().describe("Custom AI Gateway URL prefix (optional)").meta({ isAdvancedSettings: true }),
  teamIdOrSlug: z.string().optional().describe("Vercel team ID or slug (optional)").meta({ isAdvancedSettings: true }),
}), createProviderOptionsSchema('Raw JSON object for AI SDK providerOptions. Gateway supports multiple namespaces (e.g. {"gateway": {...}, "openai": {...}})'));

const config = {
  name: "Vercel AI Gateway",
  description: /* i18n */ "Use Coreply with a Vercel AI Gateway API key.",
  deprecatedDescription: /* i18n */ "Use Coreply with a Vercel AI Gateway API key. Use the new Vercel AI Gateway provider instead.",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: undefined,
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createGateway(settings.provider)(settings.model);
  },
};

export const gatewayProvider = defineStatelessAIProvider(config);
export const gatewayStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: { ...config.settingsDefaults, generateText: statefulGenerateTextDefaults },
});
