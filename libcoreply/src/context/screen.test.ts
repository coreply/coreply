import { describe, expect, it } from "vitest";

import { ScreenContextImpl } from "./screen";
import type { Profile } from "../profile";
import type { ScreenContextData } from "./screen";

const profile: Profile = {
  id: "profile",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  matchingRule: ".*",
  contextExtractors: [],
};

const screenData = (
  text: string,
  children: ScreenContextData[],
): ScreenContextData => ({ text, children });

describe("ScreenContextImpl.tryUpdate", () => {
  it("renders an empty string for empty screen data", () => {
    expect(new ScreenContextImpl(profile, screenData("", [])).renderPrompt()).toBe("");
  });

  it("preserves whitespace text and prints the header for an empty child node", () => {
    expect(new ScreenContextImpl(profile, screenData("   ", [])).renderPrompt()).toBe(
      "Text on a screen\n   \n",
    );
    expect(
      new ScreenContextImpl(profile, screenData("", [screenData("", [])])).renderPrompt(),
    ).toBe("Text on a screen\n");
  });

  it("prints the title only once and keeps top-level text flush left", () => {
    expect(new ScreenContextImpl(profile, screenData("Hello", [])).renderPrompt()).toBe(
      "Text on a screen\nHello\n",
    );
    expect(
      new ScreenContextImpl(
        profile,
        screenData("", [
          screenData("First", []),
          screenData("Second", []),
          screenData("Third", []),
        ]),
      ).renderPrompt(),
    ).toBe("Text on a screen\nFirst\nSecond\nThird\n");
  });

  it("renders a custom screen prompt template from serialized context only", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [screenData("A&B", []), screenData("<tag>", [])]),
      undefined,
      { contextTemplate: "{{type}}|{{data.text}}|{{#data.children}}{{{text}}}|{{/data.children}}" },
    );

    expect(context.renderPrompt()).toBe("screen|Root|A&B|<tag>|");
  });

  it("keeps an explicit empty screen prompt override empty", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [screenData("Child", [])]),
      undefined,
      { contextTemplate: "" },
    );

    expect(context.renderPrompt()).toBe("");
  });

  it("exposes the default partial as item to custom templates", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root & <tag>", [screenData("Child", [])]),
      undefined,
      { contextTemplate: "{{#data}}{{>item}}{{/data}}" },
    );

    expect(context.renderPrompt()).toBe("Root & <tag>\nChild\n");
  });

  it("uses an extractor partial override for recursive rendering", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [screenData("Child", [])]),
      undefined,
      { contextTemplatePartial: "{{#text}}[{{.}}]{{/text}}{{#children}}{{>item}}{{/children}}" },
    );

    expect(context.renderPrompt()).toBe("Text on a screen\n[Root][Child]");
  });

  it("keeps an explicit empty partial override empty", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [screenData("Child", [])]),
      undefined,
      { contextTemplatePartial: "" },
    );

    expect(context.renderPrompt()).toBe("Text on a screen\n");
  });

  it("treats empty fields as present and renders their inverted sections", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Parent text", [screenData("", [])]),
      undefined,
      { contextTemplate: "{{#data}}{{#children}}{{#text}}unexpected text{{/text}}{{^text}}no text{{/text}}|{{#children}}unexpected children{{/children}}{{^children}}no children{{/children}}{{/children}}{{/data}}" },
    );

    expect(context.renderPrompt()).toBe("no text|no children");
  });

  it("renders nested text in tree order", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [
        screenData("Child 1", [
          screenData("Grandchild 1.1", []),
          screenData("Grandchild 1.2", []),
        ]),
        screenData("Child 2", []),
      ]),
    );

    expect(context.renderPrompt()).toBe(
      "Text on a screen\nRoot\nChild 1\nGrandchild 1.1\nGrandchild 1.2\nChild 2\n",
    );
  });

  it("does not inherit text from parents through empty containers", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [
        screenData("", [
          screenData("", [screenData("Deeply nested text", [])]),
        ]),
      ]),
    );

    expect(context.renderPrompt()).toBe(
      "Text on a screen\nRoot\nDeeply nested text\n",
    );
  });

  it("renders siblings once without inheriting parent children at leaves", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [
        screenData("Child 1", []),
        screenData("", [screenData("Nested child", [])]),
        screenData("Child 2", []),
      ]),
    );

    expect(context.renderPrompt()).toBe(
      "Text on a screen\nRoot\nChild 1\nNested child\nChild 2\n",
    );
  });

  it("handles complex nested trees with mixed empty nodes", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Main title", [
        screenData("Section 1", [
          screenData("Subsection 1.1", [
            screenData("Item 1.1.1", []),
            screenData("Item 1.1.2", []),
          ]),
          screenData("", [
            screenData("Subsection 1.2", [screenData("Item 1.2.1", [])]),
          ]),
          screenData("Subsection 1.3", []),
        ]),
        screenData("", [screenData("", [screenData("Section 2", [])])]),
        screenData("Section 3", [
          screenData("Subsection 3.1", [
            screenData("Item 3.1.1", []),
            screenData("Item 3.1.2", []),
          ]),
        ]),
      ]),
    );

    expect(context.renderPrompt()).toBe(
      "Text on a screen\nMain title\nSection 1\nSubsection 1.1\nItem 1.1.1\nItem 1.1.2\nSubsection 1.2\nItem 1.2.1\nSubsection 1.3\nSection 2\nSection 3\nSubsection 3.1\nItem 3.1.1\nItem 3.1.2\n",
    );
  });

  it("handles a deep sparse tree with empty text wrappers", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Level 0", [
        screenData("", [
          screenData("", [
            screenData("", [screenData("", [screenData("Deep text", [])])]),
          ]),
        ]),
      ]),
    );

    expect(context.renderPrompt()).toBe(
      "Text on a screen\nLevel 0\nDeep text\n",
    );
  });

  it("skips empty text but preserves whitespace-only text", () => {
    const context = new ScreenContextImpl(
      profile,
      screenData("Root", [
        screenData("", []),
        screenData("   ", []),
        screenData("Valid text", []),
        screenData("", [screenData("Nested valid text", [])]),
      ]),
    );

    expect(context.renderPrompt()).toBe(
      "Text on a screen\nRoot\n   \nValid text\nNested valid text\n",
    );
  });

  it("returns false instead of throwing on malformed incoming data", () => {
    const existing = new ScreenContextImpl(
      profile,
      {
        text: "Profile",
        children: [{ text: "Status", children: [] }],
      },
    );
    const malformed = {
      data: {
        text: "Profile",
        children: [null],
      },
    } as unknown as ScreenContextImpl;

    expect(existing.tryUpdate(malformed)).toBe(false);
    expect(existing.data).toEqual({
      text: "Profile",
      children: [{ text: "Status", children: [] }],
    });
  });

  it("toJSON only exposes extracted context fields", () => {
    const context = new ScreenContextImpl(
      profile,
      {
        text: "Profile",
        children: [{ text: "Status", children: [] }],
      },
      "screen",
    );

    expect(context.toJSON()).toEqual({
      type: "screen",
      data: {
        text: "Profile",
        children: [{ text: "Status", children: [] }],
      },
    });
  });
});
