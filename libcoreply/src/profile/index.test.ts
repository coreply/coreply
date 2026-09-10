import jsonata from "jsonata";
import { describe, expect, it } from "vitest";

import type { AndroidSnapshotNode } from "../context/snapshot";
import { generateGenericProfile, profileGroups } from "./index";

const bounds = (
  left: number,
  top: number,
  right: number,
  bottom: number,
) => ({ left, top, right, bottom });

const node = (
  overrides: Partial<AndroidSnapshotNode> = {},
  children: AndroidSnapshotNode[] = [],
): AndroidSnapshotNode => ({
  id: "",
  className: "android.view.ViewGroup",
  viewIdResourceName: null,
  text: null,
  contentDescription: null,
  hintText: null,
  packageName: null,
  isEditable: false,
  isFocused: false,
  isVisibleToUser: true,
  isShowingHintText: false,
  bounds: bounds(0, 0, 100, 100),
  children,
  ...overrides,
});

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
    expect(
    expect(genericExtractor).toContain('"children": $append([], $tree.children)');
  });

  it("keeps telegram chat turns iterable when only one bubble matches", async () => {
    const telegramExtractor = profileGroups
      .flatMap((group) => group.profiles)
      .find((profile) => profile.id === "telegram-chat")?.extractors[0];

    const snapshot = node(
      { bounds: bounds(0, 0, 100, 200) },
      [
        node({
          packageName: "org.telegram.messenger",
          className: "android.view.ViewGroup",
          text: "hello there",
          bounds: bounds(0, 20, 40, 40),
        }),
        node({
          packageName: "org.telegram.messenger",
          className: "android.widget.EditText",
          isFocused: true,
          bounds: bounds(0, 150, 100, 190),
        }),
      ],
    );

    const result = await jsonata(telegramExtractor ?? "").evaluate(snapshot);

    expect(Array.isArray(result?.turns)).toBe(true);
    expect(result?.turns).toHaveLength(1);
    expect(Array.isArray(result?.turns[0]?.messages)).toBe(true);
    expect(result?.turns[0]?.messages).toEqual([{ body: "hello there" }]);
  });

  it("keeps generic screen children iterable when only one child matches", async () => {
    const extractor = generateGenericProfile(
      "com.example.app",
      "android",
    ).extractors[0];

    const snapshot = node(
      {
        packageName: "com.example.app",
      },
      [
        node({
          text: "Visible child",
          packageName: "com.example.app",
          bounds: bounds(0, 10, 100, 30),
        }),
      ],
    );

    const result = await jsonata(extractor).evaluate(snapshot);

    expect(Array.isArray(result?.children)).toBe(true);
    expect(result?.children).toHaveLength(1);
    expect(Array.isArray(result?.children[0]?.children)).toBe(true);
    expect(result?.children[0]?.children).toEqual([]);
  });
});
