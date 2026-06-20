import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzure } from "@ai-sdk/azure";
import { createVertex } from "@ai-sdk/google-vertex/edge";

import { z } from "zod";
import { DEFAULT_ADVANCED_BODY } from "./settings";

const BaseSettingsSchema = z.object({
  maxOutputTokens: z.number().min(1).optional(),
  temperature: z.number().min(0).max(1).optional().default(1.0),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(1).int().optional(),
  presencePenalty: z.number().min(-1).max(1).optional().default(0),
  frequencyPenalty: z.number().min(-1).max(1).optional().default(0),
  seed: z.number().int().optional(),
  maxRetries: z.number().min(0).int().default(0),
  timeout: z.number().min(0).optional(),
});

const OrdinaryGenerateTextSchema = z.object({
  system: z.string().optional(),
  model: z.string().optional(),
});

export const providerDefinitions = {
  openai: {
    name: "OpenAI",
    factoryFunc: createOpenAI,
    factorySchema: z.object({
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      organization: z.string().optional(),
      project: z.string().optional(),
    }),
    settingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  openaiCompatible: {
    name: "OpenAI Compatible",
    factoryFunc: createOpenAICompatible,
    factorySchema: z.object({
      baseUrl: z.string().optional().default(""),
      apiKey: z.string(),
    }),
    settingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  azure: {
    name: "Azure",
    factoryFunc: createAzure,
    factorySchema: z.object({
      resourceName: z.string().optional(),
      baseURL: z.string().optional(),
      apiKey: z.string().optional(),
      apiVersion: z.string().optional(),
    }),
    settingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  googleVertex: {
    name: "Google Vertex (Express Mode)",
    factoryFunc: createVertex,
    factorySchema: z.object({
      apiKey: z.string().describe("Only API key mode is supported"),
    }),
    settingsSchema: z.object({
      ...OrdinaryGenerateTextSchema.shape,
      ...BaseSettingsSchema.shape,
    }),
  },
  fim: {
    name: "Mistral FIM",
    factoryFunc: null,
    factorySchema: z.object({
      baseURL: z.string(),
      apiKey: z.string(),
    }),
    settingsSchema: z.object({
      ...BaseSettingsSchema.shape,
    }),
  },
  advanced: {
    name: "Advanced Mode",
    factoryFunc: null,
    factorySchema: z.object({
      requestUrl: z.string(),
      authorizationBearer: z.string(),
    }),
    settingsSchema: z.object({
      bodyTemplate: z.string().optional().default(DEFAULT_ADVANCED_BODY),
      suggestionTemplate: z.string().optional().default("{{assistantMessage}}"),
    }),
  },
};
