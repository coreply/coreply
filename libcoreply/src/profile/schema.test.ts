import { describe, expect, it } from "vitest";
import { ChatContextImpl } from "../context/chat";
import { ScreenContextImpl } from "../context/screen";
import { ContextStore } from "../context/store";
import { builtInProfiles, generateGenericProfile, matchesProfile, profileSchema } from ".";

describe("profile schema and context formatting", () => {
  it("validates all built-in profiles", () => {
    for (const profile of builtInProfiles) expect(profileSchema.safeParse(profile).success).toBe(true);
  });

  it("has one Android profile per package, retaining all Perplexity extractors", () => {
    const android = builtInProfiles.filter((profile) => profile.platform === "android");
    expect(new Set(android.map((profile) => profile.id)).size).toBe(android.length);
    expect(android.find((profile) => profile.id === "ai.perplexity.app.android")?.contextExtractors).toHaveLength(2);
  });

  it("matches Android packages exactly and web URLs by regex", () => {
    const android = generateGenericProfile("com.example.app", "Example");
    expect(matchesProfile(android, "android", "com.example.app")).toBe(true);
    expect(matchesProfile(android, "android", "comXexampleXapp")).toBe(false);
    const web = { ...android, platform: "web" as const, matchingRule: "^https://example\\.com/chat/" };
    expect(matchesProfile(web, "web", "https://example.com/chat/123")).toBe(true);
    expect(matchesProfile(web, "web", "https://example.com/settings")).toBe(false);
  });

  it("rejects invalid matching regexes", () => {
    expect(profileSchema.safeParse({ ...builtInProfiles[0], matchingRule: "[" }).success).toBe(false);
  });

  it("applies extractor formatting independently, including empty overrides", () => {
    const profile = generateGenericProfile("com.example", "Example");
    const data = { turns: [{ userSent: true, messages: [{ body: "Hello" }] }] };
    expect(new ChatContextImpl(profile, data).renderPrompt()).toBe("Message I sent:\nHello\n");
    expect(new ChatContextImpl(profile, data, undefined, { contextTemplatePartial: "{{body}}!" }).renderPrompt()).toBe("Hello!");
    expect(new ChatContextImpl(profile, data, undefined, { contextTemplate: "" }).renderPrompt()).toBe("");
    expect(new ScreenContextImpl(profile, { text: "Hello", children: [] }, undefined, { contextTemplatePartial: "" }).renderPrompt()).toBe("Text on a screen\n");
  });

  it("does not merge contexts with different formatting", () => {
    const profile = { ...generateGenericProfile("com.example", "Example"), dropRule: { differentProfile: 0, sameProfile: 2 } };
    const data = { turns: [{ userSent: true, messages: [{ body: "Hello" }] }] };
    const store = new ContextStore();
    store.addContext(new ChatContextImpl(profile, data));
    store.addContext(new ChatContextImpl(profile, data, undefined, { contextTemplate: "Custom" }));
    expect(store.getContexts()).toHaveLength(2);
  });
});
