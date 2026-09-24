import { describe, expect, it } from "vitest";

import { generateGenericProfile, profileGroups } from "./index";

describe("profile extractors", () => {
  it("uses array-coercing JSONata patterns for chat turns and screen children", () => {
    const extractors = profileGroups.flatMap((group) =>
      group.profiles.flatMap((profile) => profile.extractors),
    );
    const genericExtractor = generateGenericProfile(
      "com.example.app",
      "android",
    ).extractors[0];

    for (const extractor of extractors) {
      expect(extractor).not.toContain("$sorted.{");
    }

    expect(extractors.some((extractor) => extractor.includes("$sorted[].{"))).toBe(
      true,
    );
    expect(genericExtractor).toContain('"children": $append([], $tree.children)');
  });

  it("returns active empty chats for supported composers with no messages", () => {
    const extractors = profileGroups.flatMap((group) =>
      group.profiles.flatMap((profile) => profile.extractors),
    );

    expect(
      extractors.some((extractor) =>
        extractor.includes(
          '{"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": []}',
        ),
      ),
    ).toBe(true);
  });
});
