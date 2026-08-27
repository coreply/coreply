import { describe, expect, it } from "vitest";

import { buildScreenPrompt } from "./utils";

import type { ScreenContextData } from "../context/screen";

const screenData = (
  text: string | undefined,
  children?: ScreenContextData[],
): ScreenContextData => ({ text, children });

describe("buildScreenPrompt", () => {
  it("returns an empty string for empty screen data", () => {
    expect(buildScreenPrompt(screenData(undefined, []))).toBe("");
    expect(buildScreenPrompt(screenData(undefined))).toBe("");
  });

  it("prints the title only once and keeps top-level text flush left", () => {
    expect(buildScreenPrompt(screenData("Hello"))).toBe("Text on a screen\nHello\n");
    expect(
      buildScreenPrompt(
        screenData(undefined, [
          screenData("First"),
          screenData("Second"),
          screenData("Third"),
        ]),
      ),
    ).toBe("Text on a screen\nFirst\nSecond\nThird\n");
  });

  it("increases indentation only when a node has text", () => {
    const data = screenData("Root", [
      screenData("Child 1", [
        screenData("Grandchild 1.1"),
        screenData("Grandchild 1.2"),
      ]),
      screenData("Child 2"),
    ]);

    expect(buildScreenPrompt(data)).toBe(
      "Text on a screen\nRoot\n  Child 1\n    Grandchild 1.1\n    Grandchild 1.2\n  Child 2\n",
    );
  });

  it("does not increase indent through empty containers", () => {
    const data = screenData("Root", [
      screenData(undefined, [
        screenData(undefined, [
          screenData("Deeply nested text"),
        ]),
      ]),
    ]);

    expect(buildScreenPrompt(data)).toBe(
      "Text on a screen\nRoot\n  Deeply nested text\n",
    );
  });

  it("keeps sibling text at the same indentation level", () => {
    const data = screenData("Root", [
      screenData("Child 1"),
      screenData(undefined, [
        screenData("Nested child"),
      ]),
      screenData("Child 2"),
    ]);

    expect(buildScreenPrompt(data)).toBe(
      "Text on a screen\nRoot\n  Child 1\n  Nested child\n  Child 2\n",
    );
  });

  it("handles complex nested trees with mixed empty nodes", () => {
    const data = screenData("Main title", [
      screenData("Section 1", [
        screenData("Subsection 1.1", [
          screenData("Item 1.1.1"),
          screenData("Item 1.1.2"),
        ]),
        screenData(undefined, [
          screenData("Subsection 1.2", [
            screenData("Item 1.2.1"),
          ]),
        ]),
        screenData("Subsection 1.3"),
      ]),
      screenData(undefined, [
        screenData(undefined, [
          screenData("Section 2"),
        ]),
      ]),
      screenData("Section 3", [
        screenData("Subsection 3.1", [
          screenData("Item 3.1.1"),
          screenData("Item 3.1.2"),
        ]),
      ]),
    ]);

    expect(buildScreenPrompt(data)).toBe(
      "Text on a screen\nMain title\n  Section 1\n    Subsection 1.1\n      Item 1.1.1\n      Item 1.1.2\n    Subsection 1.2\n      Item 1.2.1\n    Subsection 1.3\n  Section 2\n  Section 3\n    Subsection 3.1\n      Item 3.1.1\n      Item 3.1.2\n",
    );
  });

  it("handles a deep sparse tree without increasing indent for empty wrappers", () => {
    const data = screenData("Level 0", [
      screenData(undefined, [
        screenData(undefined, [
          screenData(undefined, [
            screenData(undefined, [
              screenData("Deep text"),
            ]),
          ]),
        ]),
      ]),
    ]);

    expect(buildScreenPrompt(data)).toBe(
      "Text on a screen\nLevel 0\n  Deep text\n",
    );
  });

  it("ignores empty text values while preserving proper indentation", () => {
    const data = screenData("Root", [
      screenData(""),
      screenData("   "),
      screenData("Valid text"),
      screenData(undefined, [
        screenData("Nested valid text"),
      ]),
    ]);

    expect(buildScreenPrompt(data)).toBe(
      "Text on a screen\nRoot\n  Valid text\n  Nested valid text\n",
    );
  });
});
