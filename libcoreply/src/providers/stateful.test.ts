import { afterEach, describe, expect, it, vi } from "vitest";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock(import("ai"), async (importOriginal) => ({
  ...await importOriginal(),
  generateText: generateTextMock,
}));

import { ChatContextImpl } from "../context/chat";
import { ScreenContextImpl } from "../context/screen";
import type { Profile } from "../profile";
import { providerDefinitions } from "./index";
import { StatefulAIProviderInstance } from "./stateful";

const profile: Profile = {
  id: "chat-profile",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  matchingRule: ".*",
  contextExtractors: [],
};

const otherProfile: Profile = {
  id: "screen-profile",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  matchingRule: ".*",
  contextExtractors: [],
};

function createInstance() {
  return providerDefinitions.googleVertexStateful.createInstance();
}

function makeChatContext(turns: ConstructorParameters<typeof ChatContextImpl>[1]["turns"]) {
  return new ChatContextImpl(profile, { turns }, "messages");
}

function makeScreenContext(text: string) {
  return new ScreenContextImpl(otherProfile, { text, children: [] }, "screen");
}

const baseConfig = {
  model: "gemini-2.5-flash",
  provider: { apiKey: "test-api-key" },
  generateText: {
    instructions: "I {{#profileSystemPrompt}}{{{profileSystemPrompt}}}{{/profileSystemPrompt}}",
    typingTemplate:
      "typing={{{currentSentence}}}|current={{{currentSentence}}}|lastTurnUserSent={{#lastTurnUserSent}}true{{/lastTurnUserSent}}{{^lastTurnUserSent}}false{{/lastTurnUserSent}}|previousResponseInvalid={{#previousResponseInvalid}}true{{/previousResponseInvalid}}{{^previousResponseInvalid}}false{{/previousResponseInvalid}}",
    contextAppendTemplate: "{{#renderedContextPrompt}}APPEND {{{renderedContextPrompt}}}{{/renderedContextPrompt}}{{#completedSentencesChanged}}DONE [{{{completedSentences}}}]{{/completedSentencesChanged}}",
  },
  providerOptions: '{"vertex":{"thinkingConfig":{"thinkingLevel":"minimal"}}}',
};

afterEach(() => {
  generateTextMock.mockReset();
});

describe("StatefulAIProviderInstance", () => {
  it.each([
    "openai",
    "openaiCompatible",
    "openrouter",
    "azure",
    "xai",
    "mistral",
    "groq",
    "google",
    "googleVertex",
    "minimax",
    "gateway",
  ] as const)("retains history for the stateful %s provider", async (providerId) => {
    const statelessProvider = providerDefinitions[providerId];
    const provider = providerDefinitions[`${providerId}Stateful`];
    const instance = provider.createInstance();
    const config = {
      ...provider.settingsDefaults,
      model: "test-model",
      provider: {
        ...provider.settingsDefaults.provider,
        apiKey: "test-api-key",
        baseURL: "https://example.com/v1",
      },
    };
    const context = makeChatContext([
      { userSent: false, messages: [{ body: "Hello" }] },
    ]);

    expect(provider.stateful).toBe(true);
    expect(provider.name).toBe(statelessProvider.name);
    expect(statelessProvider.stateful).toBe(false);
    expect(provider.settingsSchema.safeParse(config).success).toBe(true);
    expect(instance).toBeInstanceOf(StatefulAIProviderInstance);

    generateTextMock
      .mockResolvedValueOnce({
        text: "H there",
        responseMessages: [{ role: "assistant", content: "H there" }],
      })
      .mockResolvedValueOnce({
        text: "Hi there",
        responseMessages: [{ role: "assistant", content: "Hi there" }],
      });

    await instance.request([context], "H", config);
    await instance.request([context], "Hi", config);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
    expect(generateTextMock.mock.calls[0]?.[0]?.providerOptions).toEqual(
      config.providerOptions ? JSON.parse(config.providerOptions) : undefined,
    );
  });

  it("uses the configured namespace for stateful OpenAI Compatible", async () => {
    const provider = providerDefinitions.openaiCompatibleStateful;
    const instance = provider.createInstance();
    generateTextMock.mockResolvedValueOnce({
      text: "Hi there",
      responseMessages: [{ role: "assistant", content: "Hi there" }],
    });

    await instance.request([], "Hi", {
      ...provider.settingsDefaults,
      name: "customProvider",
      model: "test-model",
      provider: {
        apiKey: "test-api-key",
        baseURL: "https://example.com/v1",
      },
      providerOptions: '{"customProvider":{"customSetting":true}}',
    });

    expect(generateTextMock.mock.calls[0]?.[0]?.model.provider).toBe(
      "customProvider.chat",
    );
    expect(generateTextMock.mock.calls[0]?.[0]?.providerOptions).toEqual({
      customProvider: { customSetting: true },
    });
  });

  it("sends the initial completed-sentence state and typing when the chat has no turns", async () => {
    const instance = createInstance();
    generateTextMock.mockResolvedValueOnce({
      text: "Hi there",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hi there" }] }],
    });

    await instance.request([makeChatContext([])], "Hi", baseConfig);

    expect(generateTextMock.mock.calls[0]?.[0]?.messages).toEqual([
      {
        role: "user",
        content: [{
          type: "text",
          text: "DONE []\ntyping=Hi|current=Hi|lastTurnUserSent=false|previousResponseInvalid=false",
        }],
      },
    ]);
  });

  it("combines all contexts and typing into one user message", async () => {
    const instance = createInstance();
    const chat = makeChatContext([{ userSent: false, messages: [{ body: "Hello" }] }]);
    const screen = makeScreenContext("Now on screen");
    generateTextMock.mockResolvedValueOnce({
      text: "Hi there",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hi there" }] }],
    });

    await instance.request([chat, screen], "Hi", baseConfig);

    const messages = generateTextMock.mock.calls[0]?.[0]?.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("user");
    expect(messages[0]?.content?.[0]?.text).toBe(
      `${chat.renderPrompt()}${screen.renderPrompt()}\nDONE []\ntyping=Hi|current=Hi|lastTurnUserSent=false|previousResponseInvalid=false`,
    );
  });

  it("retains history across typing updates when contexts are unchanged", async () => {
    const instance = createInstance();
    const context = makeChatContext([
      { userSent: false, messages: [{ body: "Hello" }] },
    ]);
    const renderPrompt = vi.spyOn(context, "renderPrompt");

    generateTextMock
      .mockResolvedValueOnce({ text: "H there", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "H there" }] }] })
      .mockResolvedValueOnce({ text: "Hi there", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hi there" }] }] });

    await instance.request([context], "H", baseConfig);
    await instance.request([context], "Hi", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
    expect(renderPrompt).toHaveBeenCalledTimes(1);
    renderPrompt.mockRestore();
  });

  it("uses only the active last context for lastTurnUserSent", async () => {
    const instance = createInstance();
    const chat = makeChatContext([
      { sender: "Alice", userSent: false, messages: [{ body: "Earlier" }] },
    ]);
    const screen = makeScreenContext("Now on screen");

    generateTextMock.mockResolvedValueOnce({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([chat, screen], "x", baseConfig);

    expect(generateTextMock.mock.calls[0]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "lastTurnUserSent=false",
    );
  });

  it("uses cloned contexts so later in-place context mutation can append", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "xB", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "xB" }] }] })
      .mockResolvedValueOnce({ text: "xC", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "xC" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns[0]?.messages.push({ body: "B" });
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "APPEND Message I received:\nB\n",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "typing=x",
    );
  });

  it("supports strict append inside the existing last turn", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns[0]?.messages.push({ body: "B", time: "10:00" });
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "Message I received:\nB\n",
    );
  });

  it("uses the context template when rendering appended delta contexts", async () => {
    const instance = createInstance();
    const context = new ChatContextImpl(
      profile,
      { turns: [{ userSent: false, messages: [{ body: "A" }] }] },
      "messages",
      { contextTemplate: "DELTA:{{#data.turns}}{{#messages}}{{{body}}}|{{/messages}}{{/data.turns}}" },
    );

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns[0]?.messages.push({ body: "B" });
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "APPEND DELTA:B|",
    );
  });

  it("appends new turns without rendering the full context again", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);
    const renderPrompt = vi.spyOn(context, "renderPrompt");
    generateTextMock.mockResolvedValue({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([context], "x", baseConfig);
    context.data.turns.push({ userSent: true, messages: [{ body: "B" }] });
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "APPEND Message I sent:\nB\n",
    );
    expect(renderPrompt).toHaveBeenCalledTimes(1);
    renderPrompt.mockRestore();
  });

  it("resets when an earlier turn changes despite an append to the last turn", async () => {
    const instance = createInstance();
    const context = makeChatContext([
      { userSent: false, messages: [{ body: "A" }] },
      { userSent: true, messages: [{ body: "B" }] },
    ]);
    generateTextMock.mockResolvedValue({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([context], "x", baseConfig);
    context.data.turns[0].messages[0].body = "changed";
    context.data.turns[1].messages.push({ body: "C" });
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets when only turn grouping changes with no new messages", async () => {
    const instance = createInstance();
    const context = makeChatContext([
      { userSent: false, messages: [{ body: "A" }, { body: "B" }] },
    ]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns = [
      { userSent: false, messages: [{ body: "A" }] },
      { userSent: false, messages: [{ body: "B" }] },
    ];
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets history when the context partial changes", async () => {
    const instance = createInstance();
    const context = new ChatContextImpl(
      profile,
      { turns: [{ userSent: false, messages: [{ body: "A" }] }] },
      "messages",
      { contextTemplatePartial: "Before: {{body}}\n" },
    );
    generateTextMock.mockResolvedValue({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([context], "x", baseConfig);
    context.contextTemplatePartial = "After: {{body}}\n";
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
    expect(generateTextMock.mock.calls[1]?.[0]?.messages[0]?.content?.[0]?.text).toContain("After: A\n");
  });

  it("resets when an empty turn is added with no new messages", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns = [
      { userSent: false, messages: [{ body: "A" }] },
      { userSent: true, messages: [] },
    ];
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets on non-append chat changes", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns = [{ userSent: false, messages: [{ body: "Z" }] }];
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets on metadata changes", async () => {
    const instance = createInstance();
    const context = new ChatContextImpl(
      profile,
      { id: "1", title: "A", turns: [{ userSent: false, messages: [{ body: "A" }] }] },
      "messages",
    );

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.title = "B";
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets on prepended changes", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "B" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns = [
      { userSent: false, messages: [{ body: "A" }] },
      { userSent: false, messages: [{ body: "B" }] },
    ];
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets on screen change", async () => {
    const instance = createInstance();
    const screen = makeScreenContext("Screen A");

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([screen], "x", baseConfig);
    screen.data.text = "Screen B";
    await instance.request([screen], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
  });

  it("resets on reordering contexts with different contents", async () => {
    const instance = createInstance();
    const a = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);
    const b = makeScreenContext("B");
    const replacementA = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] })
      .mockResolvedValueOnce({ text: "x3", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x3" }] }] });

    await instance.request([a, b], "x", baseConfig);
    await instance.request([b, a], "x", baseConfig);
    await instance.request([replacementA, b], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
    expect(generateTextMock.mock.calls[2]?.[0]?.messages).toHaveLength(1);
  });

  it("preserves history when contexts and profiles are replaced with equal contents", async () => {
    const instance = createInstance();
    const chat = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);
    const screen = makeScreenContext("B");
    generateTextMock.mockResolvedValue({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([chat, screen], "x", baseConfig);
    const replacementChat = new ChatContextImpl(
      structuredClone(chat.profile),
      structuredClone(chat.data),
      chat.label,
    );
    const replacementScreen = new ScreenContextImpl(
      structuredClone(screen.profile),
      structuredClone(screen.data),
      screen.label,
    );
    await instance.request([replacementChat, replacementScreen], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
  });

  it("appends new chat content when the context instance is replaced", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);
    generateTextMock.mockResolvedValue({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([context], "x", baseConfig);
    const replacement = makeChatContext([
      { userSent: false, messages: [{ body: "A" }, { body: "B" }] },
    ]);
    await instance.request([replacement], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "APPEND Message I received:\nB\n",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
  });

  it("reconstructs a reply from the current sentence while preserving whitespace", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "Hello" }] }]);

    generateTextMock.mockResolvedValueOnce({
      text: "World  again",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "World  again" }] }],
    });

    const result = await instance.request([context], "Done. World", baseConfig);
    expect(result).toBe("Done. World  again");
  });

  it("sends completed sentences initially but not on current-sentence typing updates", async () => {
    const instance = createInstance();
    generateTextMock.mockResolvedValue({
      text: "World again",
      responseMessages: [{ role: "assistant", content: "World again" }],
    });

    await instance.request([], "Done. W", baseConfig);
    await instance.request([], "Done. World", baseConfig);

    expect(generateTextMock.mock.calls[0]?.[0]?.messages.at(-1)?.content?.[0]?.text).toBe(
      "DONE [Done. ]\ntyping=W|current=W|lastTurnUserSent=false|previousResponseInvalid=false",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toBe(
      "typing=World|current=World|lastTurnUserSent=false|previousResponseInvalid=false",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
  });

  it.each([
    ["extended", "Done. Extra. World", "Done. Extra. "],
    ["edited", "Changed. World", "Changed. "],
    ["deleted", "World", ""],
  ])("replaces %s completed sentences without resetting history", async (_change, typing, completedSentences) => {
    const instance = createInstance();
    generateTextMock.mockResolvedValue({
      text: "World again",
      responseMessages: [{ role: "assistant", content: "World again" }],
    });

    await instance.request([], "Done. World", baseConfig);
    await expect(instance.request([], typing, baseConfig)).resolves.toBe(
      `${completedSentences}World again`,
    );
    await instance.request([], typing, baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toBe(
      `DONE [${completedSentences}]\ntyping=World|current=World|lastTurnUserSent=false|previousResponseInvalid=false`,
    );
    expect(generateTextMock.mock.calls[2]?.[0]?.messages.at(-1)?.content?.[0]?.text).not.toContain("DONE");
  });

  it("renders context and completed-sentence changes together in the append template", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);
    generateTextMock.mockResolvedValue({
      text: "World again",
      responseMessages: [{ role: "assistant", content: "World again" }],
    });

    await instance.request([context], "World", baseConfig);
    context.data.turns[0]?.messages.push({ body: "B" });
    await instance.request([context], "Done. World", baseConfig);
    context.data.turns[0]?.messages.push({ body: "C" });
    await instance.request([context], "Done. World", baseConfig);

    const combinedPrompt = generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text;
    expect(combinedPrompt).toContain("APPEND Message I received:\nB\n");
    expect(combinedPrompt).toContain("DONE [Done. ]");
    const contextOnlyPrompt = generateTextMock.mock.calls[2]?.[0]?.messages.at(-1)?.content?.[0]?.text;
    expect(contextOnlyPrompt).toContain("APPEND Message I received:\nC\n");
    expect(contextOnlyPrompt).not.toContain("DONE");
    expect(contextOnlyPrompt).not.toContain("Done. ");
  });

  it("includes unchanged completed sentences again after a context reset", async () => {
    const instance = createInstance();
    const context = makeScreenContext("Screen A");
    generateTextMock.mockResolvedValue({
      text: "World again",
      responseMessages: [{ role: "assistant", content: "World again" }],
    });

    await instance.request([context], "Done. World", baseConfig);
    context.data.text = "Screen B";
    await instance.request([context], "Done. World", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(1);
    expect(generateTextMock.mock.calls[1]?.[0]?.messages[0]?.content?.[0]?.text).toContain(
      "DONE [Done. ]",
    );
  });

  it("does not repeat completed sentences in a correction prompt", async () => {
    const instance = createInstance();
    generateTextMock
      .mockResolvedValueOnce({ text: "bad", responseMessages: [{ role: "assistant", content: "bad" }] })
      .mockResolvedValueOnce({ text: "World again", responseMessages: [{ role: "assistant", content: "World again" }] });

    await expect(instance.request([], "Done. World", baseConfig)).resolves.toBe("Done. World again");

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).not.toContain("Done.");
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "previousResponseInvalid=true",
    );
  });

  it.each([false, true])("does not commit completed-sentence changes after an API error, correction=%s", async (correction) => {
    const instance = createInstance();
    generateTextMock.mockResolvedValueOnce({
      text: "World again",
      responseMessages: [{ role: "assistant", content: "World again" }],
    });
    await instance.request([], "World", baseConfig);

    if (correction) {
      generateTextMock.mockResolvedValueOnce({
        text: "bad",
        responseMessages: [{ role: "assistant", content: "bad" }],
      });
    }
    generateTextMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({
        text: "World again",
        responseMessages: [{ role: "assistant", content: "World again" }],
      });

    await expect(instance.request([], "Done. World", baseConfig)).rejects.toThrow("boom");
    await instance.request([], "Done. World", baseConfig);

    const lastRequest = generateTextMock.mock.calls.at(-1)?.[0];
    expect(lastRequest.messages).toHaveLength(3);
    expect(lastRequest.messages.at(-1)?.content?.[0]?.text).toContain("DONE [Done. ]");
    expect(JSON.stringify(lastRequest.messages)).not.toContain("bad");
  });

  it("uses the default append template to clear deleted completed sentences", async () => {
    const provider = providerDefinitions.googleVertexStateful;
    const instance = provider.createInstance();
    const config = {
      ...baseConfig,
      generateText: provider.settingsDefaults.generateText,
    };
    generateTextMock.mockResolvedValue({
      text: "World again",
      responseMessages: [{ role: "assistant", content: "World again" }],
    });

    await instance.request([], "Done. World", config);
    await instance.request([], "World", config);

    expect(generateTextMock.mock.calls[0]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "<completed-sentences>\nDone. \n</completed-sentences>",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "Completed sentences already typed, replacing any previous value:\n<completed-sentences>\n\n</completed-sentences>",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
  });

  it("interpolates profile systemPrompt into instructions", async () => {
    const instance = createInstance();
    const earlierProfile: Profile = {
      ...profile,
      appSpecificInstruction: "Earlier ignored",
    };
    const instructionProfile: Profile = {
      ...profile,
      appSpecificInstruction: "Use company tone",
    };
    const earlierContext = new ChatContextImpl(
      earlierProfile,
      { turns: [{ userSent: false, messages: [{ body: "Earlier" }] }] },
      "messages",
    );
    const context = new ChatContextImpl(
      instructionProfile,
      { turns: [{ userSent: false, messages: [{ body: "Hello" }] }] },
      "messages",
    );

    generateTextMock.mockResolvedValueOnce({
      text: "Hello there",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hello there" }] }],
    });

    await instance.request([earlierContext, context], "Hello", baseConfig);

    expect(generateTextMock.mock.calls[0]?.[0]?.instructions).toContain(
      "Use company tone",
    );
    expect(generateTextMock.mock.calls[0]?.[0]?.instructions).not.toContain(
      "Earlier ignored",
    );
  });

  it("omits profile systemPrompt when the topmost context profile has none", async () => {
    const instance = createInstance();
    const earlierProfile: Profile = {
      ...profile,
      appSpecificInstruction: "Earlier ignored",
    };
    const earlierContext = new ChatContextImpl(
      earlierProfile,
      { turns: [{ userSent: false, messages: [{ body: "Earlier" }] }] },
      "messages",
    );
    const topContext = makeChatContext([{ userSent: false, messages: [{ body: "Top" }] }]);

    generateTextMock.mockResolvedValueOnce({
      text: "Top reply",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Top reply" }] }],
    });

    await instance.request([earlierContext, topContext], "Top", baseConfig);

    expect(generateTextMock.mock.calls[0]?.[0]?.instructions).not.toContain(
      "Earlier ignored",
    );
  });

  it("stores the cloned contexts that were sent when contexts mutate during the request", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    let releaseFirstRequest: (() => void) | undefined;
    generateTextMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFirstRequest = () =>
              resolve({
                text: "x1",
                responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
              });
          }),
      )
      .mockResolvedValueOnce({
        text: "x2",
        responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }],
      });

    const firstRequest = instance.request([context], "x", baseConfig);
    context.data.turns[0]?.messages.push({ body: "B" });
    releaseFirstRequest?.();
    await firstRequest;
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "APPEND Message I received:\nB\n",
    );
  });

  it("succeeds on correction retry when the second output is valid", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: true, messages: [{ body: "Ping" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "bad", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "bad" }] }] })
      .mockResolvedValueOnce({ text: "Hello there", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hello there" }] }] });

    const result = await instance.request([context], "Hello", baseConfig);

    expect(result).toBe("Hello there");
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "previousResponseInvalid=true",
    );
    expect(generateTextMock.mock.calls[1]?.[0]?.messages).toHaveLength(3);
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).not.toContain(
      "Ping",
    );
  });

  it("accepts full-output suggestions directly", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "Hello" }] }]);

    generateTextMock.mockResolvedValueOnce({
      text: "Hello there",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hello there" }] }],
    });

    await expect(instance.request([context], "Hello", baseConfig)).resolves.toBe(
      "Hello there",
    );
  });

  it("retries once with previousResponseInvalid=true and returns empty string if still invalid", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: true, messages: [{ body: "Ping" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "bad", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "bad" }] }] })
      .mockResolvedValueOnce({ text: "still bad", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "still bad" }] }] });

    const result = await instance.request([context], "Hello", baseConfig);

    expect(result).toBe("");
    expect(generateTextMock.mock.calls[1]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "previousResponseInvalid=true",
    );
  });

  it("treats equal-length unchanged output as invalid", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "Hello" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "Hello", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hello" }] }] })
      .mockResolvedValueOnce({ text: "Hello", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "Hello" }] }] });

    await expect(instance.request([context], "Hello", baseConfig)).resolves.toBe("");
  });

  it("treats empty typing validation failures as invalid and returns empty string after retry", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "Hello" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "" }] }] })
      .mockResolvedValueOnce({ text: "", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "" }] }] });

    await expect(instance.request([context], "", baseConfig)).resolves.toBe("");
  });

  it("preserves committed history consistently after an API error on a later request", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);

    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    context.data.turns[0]?.messages.push({ body: "B" });
    await expect(instance.request([context], "x", baseConfig)).rejects.toThrow("boom");
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[2]?.[0]?.messages.at(-1)?.content?.[0]?.text).toContain(
      "APPEND Message I received:\nB\n",
    );
  });

  it("throws API errors without correction retry", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "Hello" }] }]);

    generateTextMock.mockRejectedValueOnce(new Error("boom"));

    await expect(instance.request([context], "Hello", baseConfig)).rejects.toThrow("boom");
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("does not commit an invalid attempt when the correction request fails", async () => {
    const instance = createInstance();
    const context = makeChatContext([{ userSent: false, messages: [{ body: "A" }] }]);
    generateTextMock
      .mockResolvedValueOnce({ text: "x1", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }] })
      .mockResolvedValueOnce({ text: "bad", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "bad" }] }] })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ text: "x2", responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x2" }] }] });

    await instance.request([context], "x", baseConfig);
    await expect(instance.request([context], "x", baseConfig)).rejects.toThrow("boom");
    await instance.request([context], "x", baseConfig);

    expect(generateTextMock.mock.calls[3]?.[0]?.messages).toHaveLength(3);
    expect(JSON.stringify(generateTextMock.mock.calls[3]?.[0]?.messages)).not.toContain("bad");
  });
});
