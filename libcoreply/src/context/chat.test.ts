import { describe, expect, it } from "vitest";

import { ChatContextImpl } from "./chat";

const message = (body: string) => ({ body });

const turn = (userSent: boolean, sender: string, ...bodies: string[]) => ({
  sender,
  userSent,
  messages: bodies.map(message),
});

const makeContext = (profileId: string, ...turns: ReturnType<typeof turn>[]) =>
  new ChatContextImpl(
    profileId,
    { differentProfile: 0, sameProfile: 1 },
    {
      turns: turns.map((t) => ({
        sender: t.sender,
        userSent: t.userSent,
        messages: t.messages,
      })),
    },
  );

const flattenedBodies = (context: ChatContextImpl) =>
  context.data.turns.flatMap((turn) =>
    turn.messages.map((message) => message.body),
  );

describe("ChatContextImpl.tryUpdate", () => {
  it("appends new messages to the end", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "I can help", "What do you need"),
      turn(false, "them", "Need a quick answer"),
    );

    const incoming = makeContext(
      "profile",
      turn(true, "me", "I can help", "What do you need"),
      turn(false, "them", "Need a quick answer"),
      turn(true, "me", "I have it"),
    );

    expect(existing.tryUpdate(incoming)).toBe(true);
    expect(flattenedBodies(existing)).toEqual([
      "I can help",
      "What do you need",
      "Need a quick answer",
      "I have it",
    ]);
  });

  it("prepends older messages to the front", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "Need help", "Tell me more"),
    );

    const incoming = makeContext(
      "profile",
      turn(true, "me", "Earlier update", "Need help", "Tell me more"),
    );

    expect(existing.tryUpdate(incoming)).toBe(true);
    expect(flattenedBodies(existing)).toEqual([
      "Earlier update",
      "Need help",
      "Tell me more",
    ]);
  });

  it("keeps the existing context when incoming is already contained", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "Need help", "What happened"),
      turn(false, "them", "I can explain"),
      turn(true, "me", "Thanks"),
    );

    const incoming = makeContext(
      "profile",
      turn(false, "them", "I can explain"),
      turn(true, "me", "Thanks"),
    );

    expect(existing.tryUpdate(incoming)).toBe(true);
    expect(flattenedBodies(existing)).toEqual([
      "Need help",
      "What happened",
      "I can explain",
      "Thanks",
    ]);
  });

  it("returns false when there is no overlap", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "Alpha beta", "Gamma delta"),
    );

    const incoming = makeContext(
      "profile",
      turn(true, "me", "Delta zebra", "Echo tango"),
    );

    expect(existing.tryUpdate(incoming)).toBe(false);
  });

  it("ignores short common phrases as valid anchors", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "ok", "sure", "later follow-up"),
    );

    const incoming = makeContext(
      "profile",
      turn(true, "me", "ok", "sure", "next step"),
    );

    expect(existing.tryUpdate(incoming)).toBe(false);
  });

  it("merges when the anchor has 3 messages", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "hello there", "welcome back", "let me help"),
    );

    const incoming = makeContext(
      "profile",
      turn(true, "me", "hello there", "welcome back", "let me help", "new task"),
    );

    expect(existing.tryUpdate(incoming)).toBe(true);
    expect(flattenedBodies(existing)).toEqual([
      "hello there",
      "welcome back",
      "let me help",
      "new task",
    ]);
  });

  it("accepts a 2-message anchor when one message is meaningfully long", () => {
    const existing = makeContext(
      "profile",
      turn(true, "me", "please review", "thanks"),
    );

    const incoming = makeContext(
      "profile",
      turn(true, "me", "hello", "please review", "thanks"),
    );

    expect(existing.tryUpdate(incoming)).toBe(true);
    expect(flattenedBodies(existing)).toEqual([
      "hello",
      "please review",
      "thanks",
    ]);
  });
});
