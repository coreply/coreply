import { createAzure } from "@ai-sdk/azure";
import { createGoogle } from "@ai-sdk/google";
import { createGoogleVertex } from "@ai-sdk/google-vertex/edge";
import { createGroq } from "@ai-sdk/groq";
import { createMiniMax } from "@ai-sdk/minimax";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createXai } from "@ai-sdk/xai";
import { createGateway } from "ai";
import { z } from "zod";
import { DEFAULT_ADVANCED_BODY, DEFAULT_SYSTEM_PROMPT } from "../settings";
import { generateWithAdvanced } from "./advanced";
import { generateWithAIProvider } from "./base";
import { generateWithFIM } from "./fim";

const BaseSettingsSchema = z.object({
  maxOutputTokens: z
    .int()
    .min(1)
    .max(300)
    .multipleOf(1)
    .optional()
    .describe("Maximum number of tokens to generate in the reply"),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .multipleOf(0.1)
    .optional()
    .describe(
      "Controls randomness. Lower is more deterministic, higher is more creative",
    ),
  topP: z
    .number()
    .min(0)
    .max(1)
    .multipleOf(0.1)
    .optional()
    .describe("Nucleus sampling threshold for token selection"),
  topK: z
    .number()
    .int()
    .min(1)
    .max(100)
    .multipleOf(1)
    .optional()
    .describe("Limits token selection to the top K candidates at each step"),
  presencePenalty: z
    .number()
    .min(-1)
    .max(1)
    .multipleOf(0.1)
    .optional()
    .describe(
      "Encourages the model to introduce new topics instead of repeating existing ones",
    ),
  frequencyPenalty: z
    .number()
    .min(-1)
    .max(1)
    .multipleOf(0.1)
    .optional()
    .describe("Reduces repeated tokens and phrases in the generated reply"),
  maxRetries: z
    .number()
    .int()
    .min(0)
    .max(3)
    .multipleOf(1)
    .optional()
    .describe("Number of times to retry the request on failure"),
  timeout: z
    .number()
    .min(0)
    .max(5000)
    .optional()
    .describe("Request timeout in milliseconds"),
  seed: z
    .number()
    .int()
    .optional()
    .describe("Seed for deterministic outputs (optional)"),
});

const BaseSettingsDefaults = {
  maxOutputTokens: 50,
  temperature: 1.0,
  topP: 1.0,
  topK: 100,
  presencePenalty: 0,
  frequencyPenalty: 0,
};

function createProviderOptionsFieldSchema(description: string) {
  return z
    .string()
    .optional()
    .describe(description)
    .meta({ control: "textarea" })
    .refine(
      (val) => {
        if (val === "" || val === undefined) {
          return true;
        }

        try {
          const parsed = JSON.parse(val);
          return (
            !!parsed && typeof parsed === "object" && !Array.isArray(parsed)
          );
        } catch {
          return false;
        }
      },
      {
        message:
          "Invalid JSON format or provider options must be a JSON object",
      },
    );
}

function createProviderOptionsSchema(description?: string) {
  return createProviderOptionsFieldSchema(
    description ??
      'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"openai": {...}}',
  );
}

function createGenerateTextSchema() {
  return z.object({
    instructions: z
      .string()
      .describe("Instructions applied before the chat context")
      .meta({ control: "textarea" }),

    ...BaseSettingsSchema.shape,
  });
}

const GenerateTextDefaults = {
  instructions: DEFAULT_SYSTEM_PROMPT,
  ...BaseSettingsDefaults,
};

export const providerDefinitions = {
  openai: {
    name: "OpenAI",
    factoryFunc: createOpenAI,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("OpenAI API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe(
            "Custom API base URL for OpenAI-compatible routing (optional)",
          ),
        organization: z
          .string()
          .optional()
          .describe("OpenAI organization ID (optional)"),
        project: z.string().optional().describe("OpenAI project ID (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: '{"openai": {"reasoningEffort": "none"}}',
    },
    requestFunc: generateWithAIProvider,
  },
  openaiCompatible: {
    name: "OpenAI Compatible",
    factoryFunc: createOpenAICompatible,
    settingsSchema: z.object({
      name: z
        .string()
        .default("openAICompatible")
        .describe(
          "Provider namespace used for providerOptions and providerMetadata",
        ),
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("API key for the OpenAI-compatible provider")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .describe("Base URL of the OpenAI-compatible API endpoint"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Use the same namespace as the "name" field, for example {"openAICompatible": {...}}',
      ),
    }),
    settingsDefaults: {
      name: "openAICompatible",
      provider: {
        baseURL: "https://api.openai.com/v1",
      },
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: '{"openAICompatible": {"reasoningEffort": "none"}}',
    },
    requestFunc: generateWithAIProvider,
  },
  openrouter: {
    name: "OpenRouter",
    factoryFunc: createOpenRouter,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("OpenRouter API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom OpenRouter API base URL (optional)"),
        appName: z.string().default("Coreply").meta({ enabled: false }),
        appUrl: z.string().default("https://coreply.app").meta({ enabled: false }),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"openrouter": {...}}',
      ),
    }),
    settingsDefaults: {
      provider: {
        appName: "Coreply",
        appUrl: "https://coreply.app",
      },
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions:
        '{"openrouter": {"reasoning": {"enabled": false, "effort": "none"}}}',
    },
    requestFunc: generateWithAIProvider,
  },
  azure: {
    name: "Azure",
    factoryFunc: createAzure,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        resourceName: z
          .string()
          .optional()
          .describe(
            "Azure OpenAI resource name, used when base URL is not provided",
          ),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Full Azure OpenAI base URL (optional)"),
        apiKey: z
          .string()
          .optional()
          .describe("Azure OpenAI API key")
          .meta({ feature: "password" }),
        apiVersion: z
          .string()
          .optional()
          .describe("Azure OpenAI API version to use for requests"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: '{"azure": {"reasoningEffort": "none"}}',
    },
    requestFunc: generateWithAIProvider,
  },
  xai: {
    name: "xAI",
    factoryFunc: createXai,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("xAI API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom xAI API base URL (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"xai": {...}}',
      ),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: '{"xai": {"reasoningEffort": "none"}}',
    },
    requestFunc: generateWithAIProvider,
  },
  fim: {
    name: "Mistral FIM",
    factoryFunc: null,
    settingsSchema: z.object({
      provider: z.object({
        apiKey: z
          .string()
          .describe("API key for the FIM provider")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .describe("Base URL of the Fill-in-the-Middle API endpoint"),
      }),
      request: z.object({
        model: z
          .string()
          .describe("Model ID to use for fill-in-the-middle generation"),
        temperature: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Controls randomness for fill-in-the-middle generation"),
      }),
    }),
    settingsDefaults: {
      provider: {},
      request: {
        model: "codestral-latest",
        temperature: 1.0,
      },
    },
    requestFunc: generateWithFIM,
  },
  mistral: {
    name: "Mistral",
    factoryFunc: createMistral,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("Mistral API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom Mistral API base URL (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"mistral": {...}}',
      ),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: undefined,
    },
    requestFunc: generateWithAIProvider,
  },
  groq: {
    name: "Groq",
    factoryFunc: createGroq,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("Groq API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom Groq API base URL (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"groq": {...}}',
      ),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: '{"groq": {"reasoningEffort": "none"}}',
    },
    requestFunc: generateWithAIProvider,
  },
  google: {
    name: "Google (Gemini API)",
    factoryFunc: createGoogle,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("Google AI API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom Google AI API base URL (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"google": {...}}',
      ),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions:
        '{"google": {"thinkingConfig": {"thinkingBudget": 0, "thinkingLevel": "minimal"}}}',
    },
    requestFunc: generateWithAIProvider,
  },
  googleVertex: {
    name: "Google Vertex",
    factoryFunc: createGoogleVertex,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .optional()
          .describe(
            "You should either provide an API key or provide the service account credentials below. ",
          )
          .meta({ feature: "password" }),
        project: z
          .string()
          .optional()
          .describe("Project ID (if not API key supplied)"),
        location: z
          .string()
          .optional()
          .describe("Location (if not API key supplied)"),
        googleCredentials: z
          .object({
            clientEmail: z
              .string()
              .optional()
              .describe("Service account client email"),
            privateKey: z
              .string()
              .optional()
              .describe("Service account private key")
              .meta({ control: "textarea", feature: "password" }),
            privateKeyId: z
              .string()
              .optional()
              .describe("Service account private key ID"),
          })
          .optional()
          .describe("Service account credentials (if no API key supplied)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions:
        '{"googleVertex": {"thinkingConfig": {"thinkingBudget": 0}}}',
    },
    requestFunc: generateWithAIProvider,
  },
  minimax: {
    name: "MiniMax",
    factoryFunc: createMiniMax,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("MiniMax API key")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom MiniMax API base URL (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsSchema(
        'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"minimax": {...}}',
      ),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: '{"minimax": {"thinking": {"type": "disabled"}}}',
    },
    requestFunc: generateWithAIProvider,
  },
  gateway: {
    name: "Vercel AI Gateway",
    factoryFunc: createGateway,
    settingsSchema: z.object({
      model: z.string().describe("Model ID to use for text generation"),
      provider: z.object({
        apiKey: z
          .string()
          .describe("AI Gateway API key or Vercel access token")
          .meta({ feature: "password" }),
        baseURL: z
          .httpUrl()
          .optional()
          .describe("Custom AI Gateway URL prefix (optional)"),
        teamIdOrSlug: z
          .string()
          .optional()
          .describe("Vercel team ID or slug (optional)"),
      }),
      generateText: createGenerateTextSchema(),
      providerOptions: createProviderOptionsFieldSchema(
        'Raw JSON object for AI SDK providerOptions. Gateway supports multiple namespaces (e.g. {"gateway": {...}, "openai": {...}})',
      ),
    }),
    settingsDefaults: {
      provider: {},
      generateText: {
        ...GenerateTextDefaults,
      },
      providerOptions: undefined,
    },
    requestFunc: generateWithAIProvider,
  },
  advanced: {
    name: "Advanced Mode",
    factoryFunc: null,
    settingsSchema: z.object({
      provider: z.object({
        requestUrl: z
          .httpUrl()
          .describe("Request URL that will receive the generated payload"),
        authorizationBearer: z
          .string()
          .optional()
          .describe("Bearer token sent in the Authorization header")
          .meta({ feature: "password" }),
      }),
      templates: z.object({
        bodyTemplate: z
          .string()
          .describe("Mustache template used to build the outbound request body")
          .meta({ control: "textarea" }),
        suggestionTemplate: z
          .string()
          .describe(
            "Mustache template used to extract the final suggestion from the response",
          ),
      }),
    }),
    settingsDefaults: {
      provider: {},
      templates: {
        bodyTemplate: DEFAULT_ADVANCED_BODY,
        suggestionTemplate: "{{assistantMessage}}",
      },
    },
    requestFunc: generateWithAdvanced,
  },
};

export type ProviderDefinition =
  (typeof providerDefinitions)[keyof typeof providerDefinitions];

export * from "./advanced";
export * from "./base";
export * from "./fim";
