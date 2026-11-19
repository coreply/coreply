import { describe, expect, it } from "vitest";
import { ChatContextImpl } from "../context/chat";
import { ScreenContextImpl } from "../context/screen";
import { ContextStore } from "../context/store";
import { builtInProfiles, generateGenericProfile, matchesProfile, profileSchema, resolveAndroidProfile, resolveProfiles } from ".";

describe("profile resolution", () => {
  it.each(["android", "web"] as const)("resolves %s built-ins without stored profiles", (platform) => {
    expect(resolveProfiles([], platform)).toEqual(builtInProfiles.filter((profile) => profile.platform === platform));
  });

  it("uses complete stored overrides, including empty extractor lists", () => {
    const preset = builtInProfiles.find((profile) => profile.platform === "android")!;
    const override = { ...preset, contextExtractors: [] };
    const resolved = resolveProfiles([override], "android");
    expect(resolved.find((profile) => profile.id === preset.id)).toEqual(override);
    expect(resolved.filter((profile) => profile.id === preset.id)).toHaveLength(1);
    expect(preset.contextExtractors.length).toBeGreaterThan(0);
  });

  it("keeps custom web profiles and excludes other platforms", () => {
    const custom = { ...builtInProfiles.find((profile) => profile.platform === "web")!, id: "custom" };
    const android = generateGenericProfile("com.example", "Example");
    const profiles = resolveProfiles([custom, android], "web");
    expect(profiles).toContainEqual(custom);
    expect(profiles.every((profile) => profile.platform === "web")).toBe(true);
  });

  it("resolves Android overrides, built-ins, and generic profiles with installed app names", () => {
    const preset = builtInProfiles.find((profile) => profile.id === "com.whatsapp")!;
    expect(resolveAndroidProfile([], preset.id, "WhatsApp"))
      .toEqual({ ...preset, displayName: "WhatsApp" });
    const override = { ...preset, contextExtractors: [] };
    expect(resolveAndroidProfile([override], preset.id, "WhatsApp"))
      .toEqual({ ...override, displayName: "WhatsApp" });
    expect(resolveAndroidProfile([], "com.example", "Example"))
      .toEqual(generateGenericProfile("com.example", "Example"));
  });
});

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
