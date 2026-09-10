import { describe, expect, it } from "vitest";

import { normalizeExtractedContextData } from "./extracted";

describe("normalizeExtractedContextData", () => {
  it("wraps singleton chat turns and messages into arrays", () => {
    const result = normalizeExtractedContextData({
      type: "chat",
      label: "messages",
      snapshotFrequency: "active",
      turns: {
        sender: "Others",
        userSent: false,
        messages: {
          body: "hello",
        },
      },
    });

    expect(result).toEqual({
      type: "chat",
      label: "messages",
      snapshotFrequency: "active",
      turns: [
        {
          sender: "Others",
          userSent: false,
          messages: [{ body: "hello" }],
        },
      ],
    });
  });

  it("drops chat payloads that do not contain any usable messages", () => {
    expect(
      normalizeExtractedContextData({
        type: "chat",
        turns: {
          userSent: true,
          messages: [],
        },
      }),
    ).toBeNull();
  });

  it("wraps singleton screen children into arrays", () => {
    const result = normalizeExtractedContextData({
      type: "screen",
      label: "screen",
      children: {
        text: "Profile",
      },
    });

    expect(result).toEqual({
      type: "screen",
      label: "screen",
      children: [
        {
          text: "Profile",
          children: [],
        },
      ],
    });
  });

  it("preserves explicit empty screen children arrays", () => {
    const result = normalizeExtractedContextData({
      type: "screen",
      label: "screen",
      children: [],
    });

    expect(result).toEqual({
      type: "screen",
      label: "screen",
      children: [],
    });
  });
});
