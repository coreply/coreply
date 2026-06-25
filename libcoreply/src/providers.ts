import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzure } from "@ai-sdk/azure";
import { createVertex } from "@ai-sdk/google-vertex/edge";

import { z } from "zod";
import { DEFAULT_ADVANCED_BODY } from "./settings";

const BaseSettingsSchema = z.object({
  maxOutputTokens: z.number().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(1).optional().default(1.0),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).max(100).optional(),
  presencePenalty: z.number().min(-1).max(1).optional().default(0),
  frequencyPenalty: z.number().min(-1).max(1).optional().default(0),
  seed: z.number().int().optional(),
  maxRetries: z.number().int().min(0).max(10).default(0),
  timeout: z.number().min(0).max(60000).optional(),
});

const OrdinaryGenerateTextSchema = z.object({
  system: z.string().optional(),
  model: z.string().optional(),
});

export const providerDefinitions = {
  openai: {
    name: "OpenAI",
    factoryFunc: createOpenAI,
    providerSettingsSchema: z.object({
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      organization: z.string().optional(),
      project: z.string().optional(),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  openaiCompatible: {
    name: "OpenAI Compatible",
    factoryFunc: createOpenAICompatible,
    providerSettingsSchema: z.object({
      baseUrl: z.string().optional().default(""),
      apiKey: z.string(),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  azure: {
    name: "Azure",
    factoryFunc: createAzure,
    providerSettingsSchema: z.object({
      resourceName: z.string().optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      apiVersion: z.string().optional(),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  googleVertex: {
    name: "Google Vertex (Express Mode)",
    factoryFunc: createVertex,
    providerSettingsSchema: z.object({
      apiKey: z.string().describe("Only API key mode is supported"),
    }),
    generationSettingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  fim: {
    name: "Mistral FIM",
    factoryFunc: null,
    providerSettingsSchema: z.object({
      baseUrl: z.string(),
      apiKey: z.string(),
    }),
    generationSettingsSchema: z.object({
      model: z.string(),
    }),
  },
  advanced: {
    name: "Advanced Mode",
    factoryFunc: null,
    providerSettingsSchema: z.object({
      requestUrl: z.string(),
      authorizationBearer: z.string(),
    }),
    generationSettingsSchema: z.object({
      bodyTemplate: z.string().optional().default(DEFAULT_ADVANCED_BODY),
      suggestionTemplate: z.string().optional().default("{{assistantMessage}}"),
    }),
  },
};
