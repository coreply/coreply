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

import { generateText } from "ai";

import { generateWithAIProvider } from "./base";
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
  extractors: [],
  ...overrides,
});

afterEach(() => {
  generateTextMock.mockClear();
});

describe("generateWithAIProvider", () => {
  it("renders instructions from the latest context profile system prompt only", async () => {
    const contexts = [
      new ChatContextImpl(
        createProfile("a", { systemPrompt: "First <keep>" }),
        { turns: [] },
      ),
      new ChatContextImpl(
        createProfile("a", { systemPrompt: "Ignored because not topmost" }),
        { turns: [] },
      ),
      new ChatContextImpl(
        createProfile("b", { systemPrompt: "Middle ignored" }),
        { turns: [] },
      ),
      new ChatContextImpl(
        createProfile("c", { systemPrompt: "Second & final" }),
        { turns: [] },
      ),
    ];

    await generateWithAIProvider(
      providerDefinitions.gateway,
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
    await generateWithAIProvider(
      providerDefinitions.gateway,
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
          createProfile("a", { systemPrompt: "Earlier ignored" }),
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
    await generateWithAIProvider(
      providerDefinitions.gateway,
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
          createProfile("a", { systemPrompt: "Rendered" }),
          { turns: [] },
        ),
        new ChatContextImpl(
          createProfile("b", { systemPrompt: "Topmost" }),
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
