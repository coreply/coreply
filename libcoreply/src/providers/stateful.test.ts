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
  extractors: [],
};

const otherProfile: Profile = {
  id: "screen-profile",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  extractors: [],
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
      "typing={{{typing}}}|done={{{completedSentences}}}|current={{{currentSentence}}}|lastTurnUserSent={{#lastTurnUserSent}}true{{/lastTurnUserSent}}{{^lastTurnUserSent}}false{{/lastTurnUserSent}}|previousResponseInvalid={{#previousResponseInvalid}}true{{/previousResponseInvalid}}{{^previousResponseInvalid}}false{{/previousResponseInvalid}}",
    contextAppendTemplate: "APPEND {{{renderedContextPrompt}}}",
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
    expect(provider.factoryFunc).toBe(statelessProvider.factoryFunc);
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

  it("sends only the typing prompt when the chat has no turns", async () => {
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
          text: "typing=Hi|done=|current=Hi|lastTurnUserSent=false|previousResponseInvalid=false",
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
      `${chat.renderPrompt()}${screen.renderPrompt()}\ntyping=Hi|done=|current=Hi|lastTurnUserSent=false|previousResponseInvalid=false`,
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

  it("uses the profile prompt template when rendering appended delta contexts", async () => {
    const instance = createInstance();
    const templatedProfile: Profile = {
      ...profile,
      promptTemplate: "DELTA:{{#data.turns}}{{#messages}}{{{body}}}|{{/messages}}{{/data.turns}}",
    };
    const context = new ChatContextImpl(
      templatedProfile,
      { turns: [{ userSent: false, messages: [{ body: "A" }] }] },
      "messages",
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

  it("resets history when the profile partial changes", async () => {
    const instance = createInstance();
    const context = new ChatContextImpl(
      { ...profile, promptPartial: "Before: {{body}}\n" },
      { turns: [{ userSent: false, messages: [{ body: "A" }] }] },
      "messages",
    );
    generateTextMock.mockResolvedValue({
      text: "x1",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "x1" }] }],
    });

    await instance.request([context], "x", baseConfig);
    context.profile.promptPartial = "After: {{body}}\n";
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
      text: "world  again",
      responseMessages: [{ role: "assistant", content: [{ type: "text", text: "world  again" }] }],
    });

    const result = await instance.request([context], "Done. world", baseConfig);
    expect(result).toBe("Done. world  again");
  });

  it("interpolates profile systemPrompt into instructions", async () => {
    const instance = createInstance();
    const earlierProfile: Profile = {
      ...profile,
      systemPrompt: "Earlier ignored",
    };
    const instructionProfile: Profile = {
      ...profile,
      systemPrompt: "Use company tone",
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
      systemPrompt: "Earlier ignored",
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
