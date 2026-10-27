import { afterEach, describe, expect, it, vi } from "vitest";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(async (options: { instructions?: string }) => ({
    text: options.instructions ?? "",
  })),
}));

vi.mock(import("ai"), async (importOriginal) => ({
  ...await importOriginal(),
  generateText: generateTextMock,
}));

import { createGateway, generateText } from "ai";

import { generateStatelessSuggestion } from "./base";
import { providerDefinitions } from "./index";
import { ChatContextImpl } from "../context/chat";
import type { Profile } from "../profile";

const createProfile = (
  id: string,
  overrides: Partial<Profile> = {},
): Profile => ({
  id,
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  matchingRule: ".*",
  contextExtractors: [],
  ...overrides,
});

afterEach(() => {
  generateTextMock.mockClear();
});

const model = createGateway({ apiKey: "secret" })("test-model");

describe("stateless AI provider construction", () => {
  it.each([
    "openai", "openaiCompatible", "openrouter", "azure", "xai", "mistral",
    "groq", "google", "googleVertex", "minimax", "gateway",
  ] as const)("creates the model from %s settings", async (id) => {
    const definition = providerDefinitions[id];
    const instance = definition.createInstance();

    await instance.request([], "Hi", {
      ...definition.settingsDefaults,
      model: "test-model",
      provider: {
        ...definition.settingsDefaults.provider,
        apiKey: "test-key",
        baseURL: "https://example.com/v1",
      },
      generateText: { instructions: "Test instructions" },
    });

    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: expect.objectContaining({ modelId: "test-model" }),
      instructions: "Test instructions",
      prompt: expect.stringContaining("The reply should start with 'Hi'"),
    }));
  });

  it("passes the OpenAI Compatible namespace to model creation", async () => {
    await providerDefinitions.openaiCompatible.createInstance().request([], "", {
      ...providerDefinitions.openaiCompatible.settingsDefaults,
      name: "customNamespace",
      model: "test-model",
      provider: { apiKey: "test-key", baseURL: "https://example.com/v1" },
    });

    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: expect.objectContaining({ provider: "customNamespace.chat" }),
    }));
  });
});

describe("generateStatelessSuggestion", () => {
  it("renders instructions from the latest context profile system prompt only", async () => {
    const contexts = [
      new ChatContextImpl(
        createProfile("a", { appSpecificInstruction: "First <keep>" }),
        { turns: [] },
      ),
      new ChatContextImpl(
        createProfile("a", { appSpecificInstruction: "Ignored because not topmost" }),
        { turns: [] },
      ),
      new ChatContextImpl(
        createProfile("b", { appSpecificInstruction: "Middle ignored" }),
        { turns: [] },
      ),
      new ChatContextImpl(
        createProfile("c", { appSpecificInstruction: "Second & final" }),
        { turns: [] },
      ),
    ];

    await generateStatelessSuggestion(
      model,
      {
        model: "test-model",
        provider: {
          apiKey: "secret",
        },
        generateText: {
          instructions:
            "Base\n{{#profileSystemPrompt}}Profiles:\n{{{profileSystemPrompt}}}{{/profileSystemPrompt}}",
        },
      },
      contexts,
      "",
    );

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "Base\nProfiles:\nSecond & final",
      }),
    );
    expect(generateTextMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        instructions: "Base\nProfiles:\nSecond & final",
      }),
    );
  });

  it("omits optional profile instructions when the latest context profile has none", async () => {
    await generateStatelessSuggestion(
      model,
      {
        model: "test-model",
        provider: {
          apiKey: "secret",
        },
        generateText: {
          instructions:
            "Base{{#profileSystemPrompt}} should-not-appear {{{profileSystemPrompt}}}{{/profileSystemPrompt}}",
        },
      },
      [
        new ChatContextImpl(
          createProfile("a", { appSpecificInstruction: "Earlier ignored" }),
          { turns: [] },
        ),
        new ChatContextImpl(createProfile("b"), { turns: [] }),
      ],
      "",
    );

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "Base",
      }),
    );
  });

  it("does not let the raw instruction template overwrite the rendered instructions", async () => {
    await generateStatelessSuggestion(
      model,
      {
        model: "test-model",
        provider: {
          apiKey: "secret",
        },
        generateText: {
          instructions: "Hello {{{profileSystemPrompt}}}",
          maxOutputTokens: 12,
        },
      },
      [
        new ChatContextImpl(
          createProfile("a", { appSpecificInstruction: "Rendered" }),
          { turns: [] },
        ),
        new ChatContextImpl(
          createProfile("b", { appSpecificInstruction: "Topmost" }),
          { turns: [] },
        ),
      ],
      "",
    );

    expect(generateTextMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        instructions: "Hello Topmost",
        maxOutputTokens: 12,
      }),
    );
  });
});
