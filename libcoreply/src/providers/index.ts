import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzure } from "@ai-sdk/azure";
import { createVertex } from "@ai-sdk/google-vertex/edge";

import { generateWithAIProvider } from "./base";
import { generateWithFIM } from "./fim";
import { generateWithAdvanced } from "./advanced";
import { z } from "zod";
import { DEFAULT_ADVANCED_BODY } from "../settings";

const passwordFieldMeta = {
  control: "password",
};

const multilineFieldMeta = {
  control: "textarea",
};

const BaseSettingsSchema = z.object({
  maxOutputTokens: z
    .number()
    .min(1)
    .max(300)
    .optional()
    .describe("Maximum number of tokens to generate in the reply"),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(1.0)
    .describe("Controls randomness. Lower is more deterministic, higher is more creative"),
  topP: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Nucleus sampling threshold for token selection"),
  topK: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Limits token selection to the top K candidates at each step"),
  presencePenalty: z
    .number()
    .min(-1)
    .max(1)
    .optional()
    .default(0)
    .describe("Encourages the model to introduce new topics instead of repeating existing ones"),
  frequencyPenalty: z
    .number()
    .min(-1)
    .max(1)
    .optional()
    .default(0)
    .describe("Reduces repeated tokens and phrases in the generated reply"),
  seed: z
    .number()
    .int()
    .optional()
    .describe("Optional seed for deterministic outputs"),
  maxRetries: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of times to retry the request on failure"),
  timeout: z
    .number()
    .min(0)
    .max(5000)
    .optional()
    .describe("Request timeout in milliseconds"),
});

const OrdinaryGenerateTextSchema = z.object({
  system: z
    .string()
    .optional()
    .describe("Optional system instruction applied before the chat context")
    .meta(multilineFieldMeta),
  model: z
    .string()
    .optional()
    .describe("Model ID to use for text generation"),
  providerOptions: z
    .string()
    .optional()
    .describe("Raw JSON object passed directly to AI SDK providerOptions")
    .meta(multilineFieldMeta),
});

export const providerDefinitions = {
  openai: {
    name: "OpenAI",
    factoryFunc: createOpenAI,
    providerSettingsSchema: z.object({
      baseURL: z
        .string()
        .optional()
        .describe("Optional custom API base URL for OpenAI-compatible routing"),
      apiKey: z
        .string()
        .optional()
        .describe("OpenAI API key")
        .meta(passwordFieldMeta),
      organization: z
        .string()
        .optional()
        .describe("Optional OpenAI organization ID"),
      project: z.string().optional().describe("Optional OpenAI project ID"),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
    requestFunc: generateWithAIProvider,
  },
  openaiCompatible: {
    name: "OpenAI Compatible",
    factoryFunc: createOpenAICompatible,
    providerSettingsSchema: z.object({
      baseURL: z
        .string()
        .optional()
        .default("")
        .describe("Base URL of the OpenAI-compatible API endpoint"),
      apiKey: z
        .string()
        .describe("API key for the OpenAI-compatible provider")
        .meta(passwordFieldMeta),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
    requestFunc: generateWithAIProvider,
  },
  azure: {
    name: "Azure",
    factoryFunc: createAzure,
    providerSettingsSchema: z.object({
      resourceName: z
        .string()
        .optional()
        .describe("Azure OpenAI resource name, used when base URL is not provided"),
      baseURL: z
        .string()
        .optional()
        .describe("Optional full Azure OpenAI base URL"),
      apiKey: z
        .string()
        .optional()
        .describe("Azure OpenAI API key")
        .meta(passwordFieldMeta),
      apiVersion: z
        .string()
        .optional()
        .describe("Azure OpenAI API version to use for requests"),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
    requestFunc: generateWithAIProvider,
  },
  googleVertex: {
    name: "Google Vertex (Express Mode)",
    factoryFunc: createVertex,
    providerSettingsSchema: z.object({
      apiKey: z
        .string()
        .describe("Only API key mode is supported")
        .meta(passwordFieldMeta),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
    requestFunc: generateWithAIProvider,
  },
  fim: {
    name: "Mistral FIM",
    factoryFunc: null,
    providerSettingsSchema: z.object({
      baseURL: z
        .string()
        .describe("Base URL of the Fill-in-the-Middle API endpoint"),
      apiKey: z
        .string()
        .describe("API key for the FIM provider")
        .meta(passwordFieldMeta),
    }),
    generationSettingsSchema: z.object({
      model: z.string().describe("Model ID to use for fill-in-the-middle generation"),
    }),
    requestFunc: generateWithFIM,
  },
  advanced: {
    name: "Advanced Mode",
    factoryFunc: null,
    providerSettingsSchema: z.object({
      requestUrl: z
        .string()
        .describe("Request URL that will receive the generated payload"),
      authorizationBearer: z
        .string()
        .describe("Bearer token sent in the Authorization header")
        .meta(passwordFieldMeta),
    }),
    generationSettingsSchema: z.object({
      bodyTemplate: z
        .string()
        .optional()
        .default(DEFAULT_ADVANCED_BODY)
        .describe("Mustache template used to build the outbound request body")
        .meta(multilineFieldMeta),
      suggestionTemplate: z
        .string()
        .optional()
        .default("{{assistantMessage}}")
        .describe("Mustache template used to extract the final suggestion from the response"),
    }),
    requestFunc: generateWithAdvanced,
  },
};

export type ProviderDefinition =
  (typeof providerDefinitions)[keyof typeof providerDefinitions];

export * from "./base";
export * from "./fim";
export * from "./advanced";
