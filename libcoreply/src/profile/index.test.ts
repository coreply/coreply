import jsonata from "jsonata";
import { describe, expect, it } from "vitest";
import { generateGenericProfile, builtInProfiles } from "./index";

function getProfile(id: string) {
  const profile = builtInProfiles.find((profile) => profile.id === id);
  if (!profile) {
    throw new Error(`Profile ${id} not found`);
  }
  return profile;
}

describe("WhatsApp web chat extractor", () => {
  it("extracts message containers and uses their position to identify sent messages", async () => {
    const extractor = jsonata(getProfile("whatsapp-web-chat").contextExtractors[0].extractor);
    const snapshot = { children: [{ attributes: { "data-testid": "conversation-panel-wrapper" }, children: [
      { attributes: { "data-testid": "conversation-panel-messages" }, bounds: { left: 100, right: 500 }, children: [
        { isVisible: true, attributes: { "data-testid": "msg-container" }, bounds: { left: 110, right: 300 }, text: "Hello", children: [] },
        { isVisible: true, attributes: { "data-testid": "msg-container" }, bounds: { left: 300, right: 490 }, text: "Hi", children: [] },
      ] },
      { attributes: { "data-testid": "conversation-compose-box-input" }, isContentEditable: true, isVisible: true, isFocused: true },
    ] }] };
    expect(await extractor.evaluate(snapshot)).toEqual({
      type: "chat", label: "messages", snapshotFrequency: "active", turns: [
        { sender: "Others", userSent: false, messages: [{ body: "Hello" }] },
        { sender: "Me", userSent: true, messages: [{ body: "Hi" }] },
      ],
    });
    expect(await extractor.evaluate({ children: [] })).toBeNull();
  });
});

describe("Instagram web chat extractor", () => {
  it("extracts incoming and outgoing text and tracks composer focus", async () => {
    const extractor = jsonata(getProfile("instagram-web-chat").contextExtractors[0].extractor);
    const snapshot = {
      children: [
        { role: "group", isVisible: true, bounds: { left: 100, right: 500 }, children: [
          { role: "article", isVisible: true, bounds: { left: 110, right: 300 }, text: "Hello" },
        ] },
        { role: "group", isVisible: true, bounds: { left: 100, right: 500 }, children: [
          { role: "article", isVisible: true, bounds: { left: 300, right: 490 }, text: "Hi" },
        ] },
        { tagName: "DIV", isVisible: true, isContentEditable: true, isFocused: true, attributes: { "data-lexical-editor": "true" } },
      ],
    };
    expect(await extractor.evaluate(snapshot)).toEqual({
      type: "chat", label: "messages", snapshotFrequency: "active", turns: [
        { sender: "Others", userSent: false, messages: [{ body: "Hello" }] },
        { sender: "Me", userSent: true, messages: [{ body: "Hi" }] },
      ],
    });
    expect(await extractor.evaluate({ children: snapshot.children.slice(0, 2) })).toBeNull();
  });
});

describe("screen extractors", () => {
  it("emits text and children on every generic screen node", async () => {
    const profile = generateGenericProfile("com.example.app", "Example");
    const result = await jsonata(profile.contextExtractors[0].extractor).evaluate({
      children: [
        { text: "Leaf" },
        { text: null, children: [{ text: "Nested" }] },
      ],
    });

    expect(result).toEqual({
      type: "screen",
      label: "screen",
      snapshotFrequency: "frequent",
      text: "",
      children: [
        { text: "Leaf", children: [] },
        { text: "", children: [{ text: "Nested", children: [] }] },
      ],
    });
  });

  it("does not create a generic context solely because empty text fields exist", async () => {
    const profile = generateGenericProfile("com.example.app", "Example");
    expect(await jsonata(profile.contextExtractors[0].extractor).evaluate({ children: [{ text: "" }] })).toBeNull();
  });

  it("emits required fields in the Tinder screen tree", async () => {
    const profile = getProfile("com.tinder");
    const result = await jsonata(profile.contextExtractors[1].extractor).evaluate({
      children: [{ id: "com.tinder:id/user_rec_sparks_profile", children: [{ text: "Profile" }] }],
    });

    expect(result).toEqual({
      type: "screen",
      label: "user_profile",
      snapshotFrequency: "frequent",
      text: "",
      children: [{ text: "Profile", children: [] }],
    });
  });

  it("emits empty children for the Perplexity search composer", async () => {
    const profile = getProfile("ai.perplexity.app.android");
    const result = await jsonata(profile.contextExtractors[0].extractor).evaluate({
      children: [{ id: "input-search", isFocused: true }, { id: "home-screen" }],
    });

    expect(result).toEqual({
      type: "screen",
      label: "search",
      snapshotFrequency: "active",
      text: "Perplexity search composer",
      children: [],
    });
  });
});
