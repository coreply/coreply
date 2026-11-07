import { createGoogleVertex } from "@ai-sdk/google-vertex/edge";
import { z } from "zod";
import { defineStatelessAIProvider, defineStatefulAIProvider } from "../ai-definition";
import {
  createAISettingsSchema,
  createProviderOptionsSchema,
  createStatefulGenerateTextSchema,
  generateTextDefaults,
  statefulGenerateTextDefaults,
} from "../settings";

export const GoogleVertexBaseProviderSchema = z.object({
  apiKey: z.string().optional()
    .describe("You should either provide an API key or provide the service account credentials below. ")
    .meta({ feature: "password" }),
  project: z.string().optional().describe("Project ID (if not API key supplied)").meta({ isAdvancedSettings: true }),
  location: z.string().optional().describe("Location (if not API key supplied)").meta({ isAdvancedSettings: true }),
  googleCredentials: z.object({
    clientEmail: z.string().describe("Service account client email").meta({ isAdvancedSettings: true }),
    privateKey: z.string().describe("Service account private key")
      .meta({ control: "textarea", feature: "password", isAdvancedSettings: true }),
    privateKeyId: z.string().optional().describe("Service account private key ID").meta({ isAdvancedSettings: true }),
  }).optional()
    .describe("Service account credentials. Omit for API-key authentication; when supplied, client email and private key are required.").meta({ isAdvancedSettings: true }),
});

const settingsSchema = createAISettingsSchema(
  GoogleVertexBaseProviderSchema, createProviderOptionsSchema(),
);

const config = {
  name: "Google Vertex",
  settingsSchema,
  settingsDefaults: {
    provider: {},
    generateText: { ...generateTextDefaults },
    providerOptions: '{"googleVertex": {"thinkingConfig": {"thinkingLevel": "minimal"}}}',
  },
  createModel(settings: z.output<typeof settingsSchema>) {
    return createGoogleVertex(settings.provider)(settings.model);
  },
};

export const googleVertexProvider = defineStatelessAIProvider(config);
export const googleVertexStatefulProvider = defineStatefulAIProvider({
  ...config,
  settingsSchema: settingsSchema.extend({ generateText: createStatefulGenerateTextSchema() }),
  settingsDefaults: {
    ...config.settingsDefaults,
    generateText: statefulGenerateTextDefaults,
    providerOptions: '{"vertex": {"thinkingConfig": {"thinkingLevel": "minimal"}}}',
  },
});
