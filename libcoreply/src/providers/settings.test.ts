import { describe, expect, it } from "vitest";
import { GoogleVertexBaseProviderSchema, providerDefinitions } from "./index";

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
