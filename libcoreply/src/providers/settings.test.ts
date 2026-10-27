import { describe, expect, it } from "vitest";
import { z } from "zod";
import { GoogleVertexBaseProviderSchema, providerDefinitions } from "./index";

describe("provider settings contract", () => {
  const aiProviderIds = [
    "openai", "openaiCompatible", "openrouter", "azure", "xai", "mistral",
    "groq", "google", "googleVertex", "minimax", "gateway",
  ] as const;

  it("preserves the stored provider IDs", () => {
    expect(Object.keys(providerDefinitions).sort()).toEqual([
      ...aiProviderIds,
      ...aiProviderIds.map((id) => `${id}Stateful`),
      "coreplyCloud", "coreplyCloudStateful", "fim", "advanced",
    ].sort());
  });

  it.each(aiProviderIds)("preserves %s settings and form metadata", (id) => {
    const stateless = providerDefinitions[id];
    const stateful = providerDefinitions[`${id}Stateful`];
    const config = {
      ...stateless.settingsDefaults,
      model: "test-model",
      provider: {
        ...stateless.settingsDefaults.provider,
        apiKey: "test-key",
        baseURL: "https://example.com/v1",
      },
    };

    expect(stateless.settingsSchema.safeParse(config).success).toBe(true);
    expect(stateful.settingsSchema.safeParse({
      ...config,
      generateText: stateful.settingsDefaults.generateText,
    }).success).toBe(true);

    const schema = z.toJSONSchema(stateless.settingsSchema);
    const statefulSchema = z.toJSONSchema(stateful.settingsSchema);
    expect(schema.properties?.provider).toEqual(statefulSchema.properties?.provider);
    expect(schema.properties?.providerOptions).toEqual(statefulSchema.properties?.providerOptions);
    expect(schema.properties?.generateText).toMatchObject({
      properties: {
        instructions: { control: "textarea", description: "Instructions applied before the chat context" },
      },
    });
    expect(schema.properties?.provider).toMatchObject({
      properties: { apiKey: { feature: "password" } },
    });
    expect(statefulSchema.properties?.generateText).toMatchObject({
      properties: {
        typingTemplate: { control: "textarea", textareaSize: "m" },
        contextAppendTemplate: { control: "textarea" },
      },
    });
  });

  it("preserves service-specific defaults and UI controls", () => {
    expect(providerDefinitions.googleVertex.settingsDefaults.providerOptions)
      .toBe('{"googleVertex": {"thinkingConfig": {"thinkingLevel": "minimal"}}}');
    expect(providerDefinitions.googleVertexStateful.settingsDefaults.providerOptions)
      .toBe('{"vertex": {"thinkingConfig": {"thinkingLevel": "minimal"}}}');
    expect(z.toJSONSchema(providerDefinitions.openrouter.settingsSchema).properties?.provider)
      .toMatchObject({
        properties: {
          appName: { enabled: false, default: "Coreply" },
          appUrl: { enabled: false, default: "https://coreply.app" },
        },
      });
    expect(providerDefinitions.openaiCompatible.settingsSchema.parse({
      ...providerDefinitions.openaiCompatible.settingsDefaults,
      model: "test-model",
      provider: { apiKey: "test-key", baseURL: "https://example.com/v1" },
      name: "customNamespace",
    }).name).toBe("customNamespace");
  });
});

describe("FIM settings", () => {
  it("defaults the endpoint when omitted", () => {
    const settings = providerDefinitions.fim.settingsSchema.parse({
      ...providerDefinitions.fim.settingsDefaults,
      provider: { apiKey: "test-key" },
    });
    expect(settings.provider.baseURL).toBe(providerDefinitions.fim.settingsDefaults.provider.baseURL);
  });

  it("preserves a custom endpoint", () => {
    const settings = providerDefinitions.fim.settingsSchema.parse({
      ...providerDefinitions.fim.settingsDefaults,
      provider: { apiKey: "test-key", baseURL: "https://example.com/fim/" },
    });
    expect(settings.provider.baseURL).toBe("https://example.com/fim/");
  });
});

describe("Vertex authentication settings", () => {
  it("accepts API-key authentication without service account credentials", () => {
    expect(GoogleVertexBaseProviderSchema.parse({ apiKey: "test-key" })).toEqual({ apiKey: "test-key" });
  });

  it("accepts complete service account credentials without an API key", () => {
    const settings = {
      project: "test-project",
      location: "global",
      googleCredentials: { clientEmail: "service@example.com", privateKey: "test-private-key" },
    };
    expect(GoogleVertexBaseProviderSchema.parse(settings)).toEqual(settings);
  });

  it("rejects incomplete service account credentials", () => {
    expect(GoogleVertexBaseProviderSchema.safeParse({ googleCredentials: { privateKey: "test-private-key" } }).success).toBe(false);
    expect(GoogleVertexBaseProviderSchema.safeParse({ googleCredentials: { clientEmail: "service@example.com" } }).success).toBe(false);
  });
});
