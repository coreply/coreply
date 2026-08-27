import { describe, expect, it } from "vitest";
import Mustache from "mustache";

import { buildAdvancedContextMap } from "./advanced";
import type { ChatContext, CoreplyContext } from "../context";
import { ChatContextImpl } from "../context/chat";
import type { ScreenContext, ScreenContextData } from "../context/screen";
import { ScreenContextImpl } from "../context/screen";

function makeChatContext(
  turns: Array<{
    sender?: string;
    userSent: boolean;
    messages: Array<{ body: string; time?: string; quote?: string }>;
  }>,
): ChatContext {
  return new ChatContextImpl("test-chat", { turns }, "messages");
}

function makeScreenContext(
  text: string | undefined,
  children?: ScreenContextData[],
): ScreenContext {
  return new ScreenContextImpl("test-screen", { text, children }, "screen");
}

describe("buildAdvancedContextMap — v2-compatible fields", () => {
  const contexts: CoreplyContext[] = [
    makeChatContext([
      {
        sender: "Alice",
        userSent: false,
        messages: [{ body: "Hey there" }],
      },
      {
        userSent: true,
        messages: [{ body: "Hi Alice" }],
      },
    ]),
  ];

  it("currentTyping is a TemplateMap with raw/jsonEscaped/regexLiteral variants", () => {
    const map = buildAdvancedContextMap(contexts, 'Hello "world"', "");
    const currentTyping = map.currentTyping as Record<string, string> | null;

    expect(currentTyping).not.toBeNull();
    expect(currentTyping!.raw).toBe('Hello "world"');
    expect(currentTyping!.jsonEscaped).toBe('Hello \\"world\\"');
    // regexLiteral only escapes regex metacharacters, " is not one
    expect(currentTyping!.regexLiteral).toBe('Hello "world"');
  });

  it("currentTyping.raw works in a mustache template (v2-style)", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "");
    const rendered = Mustache.render("{{currentTyping.raw}}", map);
    expect(rendered).toBe("hello");
  });

  it("currentTyping.jsonEscaped produces JSON-safe output (v2-style)", () => {
    const map = buildAdvancedContextMap(contexts, 'He said "hi"', "");
    const currentTyping = map.currentTyping as Record<string, string> | null;
    // jsonEscaped wraps in JSON.stringify then strips outer quotes, so " becomes \"
    expect(currentTyping!.jsonEscaped).toBe('He said \\"hi\\"');
  });

  it("currentTypingTrimmed is a TemplateMap (last token removed)", () => {
    const map = buildAdvancedContextMap(contexts, "hello world", "");
    const trimmed = map.currentTypingTrimmed as Record<string, string> | null;

    expect(trimmed).not.toBeNull();
    expect(trimmed!.raw).toBe("hello ");
  });

  it("currentTypingLastToken is a TemplateMap", () => {
    const map = buildAdvancedContextMap(contexts, "hello world", "");
    const lastToken = map.currentTypingLastToken as Record<string, string> | null;

    expect(lastToken).not.toBeNull();
    expect(lastToken!.raw).toBe("world");
  });

  it("currentTypingEndsWithSeparator is a boolean", () => {
    const withSeparator = buildAdvancedContextMap(contexts, "hello ", "");
    expect(withSeparator.currentTypingEndsWithSeparator).toBe(true);

    const without = buildAdvancedContextMap(contexts, "hello", "");
    expect(without.currentTypingEndsWithSeparator).toBe(false);
  });

  it("pastMessages has v2-compatible structure with sent/received/sender/messages", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "");
    const pastMessages = map.pastMessages as Array<Record<string, unknown>>;

    expect(pastMessages).toHaveLength(2);

    // First turn: received (sender "Alice" normalizes to "OnScreen" in v2 ChatContents)
    expect(pastMessages[0].sent).toBe(false);
    expect(pastMessages[0].received).toBe(true);
    const sender0 = pastMessages[0].sender as Record<string, string> | null;
    expect(sender0!.raw).toBe("OnScreen");

    const messages0 = pastMessages[0].messages as Array<Record<string, unknown>>;
    expect(messages0).toHaveLength(1);
    const content0 = messages0[0].content as Record<string, string> | null;
    expect(content0!.raw).toBe("Hey there");

    // Second turn: sent by Me
    expect(pastMessages[1].sent).toBe(true);
    expect(pastMessages[1].received).toBe(false);
    const sender1 = pastMessages[1].sender as Record<string, string> | null;
    expect(sender1!.raw).toBe("Me");
  });

  it("pastMessages works in a v2-style mustache template", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "");
    const template = `{{#pastMessages}}{{sender.raw}}: {{#messages}}{{content.raw}}{{/messages}}; {{/pastMessages}}`;
    const rendered = Mustache.render(template, map);
    expect(rendered).toBe("OnScreen: Hey there; Me: Hi Alice; ");
  });

  it("pkgName is a TemplateMap (v2-style)", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "com.whatsapp");
    const pkgName = map.pkgName as Record<string, string> | null;

    expect(pkgName).not.toBeNull();
    expect(pkgName!.raw).toBe("com.whatsapp");
  });

  it("dynamic pkgName field (dots replaced with underscores) is true", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "com.whatsapp.w4b");
    expect(map["com_whatsapp_w4b"]).toBe(true);
  });

  it("empty currentTyping produces null TemplateMap", () => {
    const map = buildAdvancedContextMap(contexts, "", "");
    expect(map.currentTyping).toBeNull();
  });
});

describe("buildAdvancedContextMap — contexts field", () => {
  const contexts: CoreplyContext[] = [
    makeChatContext([
      {
        userSent: false,
        messages: [{ body: "Hi" }],
      },
    ]),
  ];

  it("contexts contains the context objects directly", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "");
    const ctxs = map.contexts as CoreplyContext[];

    expect(ctxs).toHaveLength(1);
    expect(ctxs[0].type).toBe("chat");
    expect(ctxs[0].profileId).toBe("test-chat");
    expect(ctxs[0].label).toBe("messages");
    expect(ctxs[0].data.turns).toHaveLength(1);
  });

  it("contextsJson is a JSON string of the context objects", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "");
    const json = map.contextsJson as string;
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("chat");
    expect(parsed[0].data.turns).toHaveLength(1);
  });
});

describe("buildAdvancedContextMap — fields coexist", () => {
  const contexts: CoreplyContext[] = [
    makeChatContext([
      {
        userSent: true,
        messages: [{ body: "test" }],
      },
    ]),
  ];

  it("both pastMessages (v2) and contexts are available simultaneously", () => {
    const map = buildAdvancedContextMap(contexts, "hello", "");

    expect(map.pastMessages).toBeDefined();
    expect(map.contexts).toBeDefined();
  });
});

describe("buildAdvancedContextMap — screen contexts", () => {
  it("includes screen contexts in contexts but not in pastMessages", () => {
    const screenContext = makeScreenContext("Profile info", undefined) as unknown as CoreplyContext;
    const chatContext = makeChatContext([
      { userSent: false, messages: [{ body: "msg" }] },
    ]) as unknown as CoreplyContext;

    const map = buildAdvancedContextMap([screenContext, chatContext], "hello", "");

    const ctxs = map.contexts as CoreplyContext[];
    expect(ctxs).toHaveLength(2);
    expect(ctxs[0].type).toBe("screen");
    expect(ctxs[1].type).toBe("chat");

    // pastMessages only includes chat contexts
    const pastMessages = map.pastMessages as Array<Record<string, unknown>>;
    expect(pastMessages).toHaveLength(1);
  });
});

describe("buildAdvancedContextMap — empty/edge cases", () => {
  it("handles empty contexts", () => {
    const map = buildAdvancedContextMap([], "hello", "");

    expect(map.pastMessages).toEqual([]);
    expect(map.contexts).toEqual([]);
  });

  it("handles empty currentTyping", () => {
    const map = buildAdvancedContextMap([], "", "");

    expect(map.currentTyping).toBeNull();
    expect(map.currentTypingTrimmed).toBeNull();
    expect(map.currentTypingLastToken).toBeNull();
  });

  it("handles currentTyping with trailing punctuation", () => {
    const map = buildAdvancedContextMap([], "hello,", "");

    const lastToken = map.currentTypingLastToken as Record<string, string> | null;
    // Trailing punctuation merges with previous token
    expect(lastToken!.raw).toBe("hello,");
  });
});
