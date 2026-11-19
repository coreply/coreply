import { describe, expect, it } from "vitest";
import { CoreplyStorageManager, STORAGE_KEYS } from "./storage";
import { builtInProfiles, resolveAndroidProfile } from "libcoreply";

function createStore(platform: "android" | "web") {
  const values = new Map<string, string>();
  const manager = new CoreplyStorageManager({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  }, platform);
  return { manager, values };
}

describe("CoreplyStorageManager saved settings", () => {
  it("does not count defaults as saved settings", async () => {
    const { manager } = createStore("android");
    await manager.loadSettings();
    expect(await manager.hasSavedSettings()).toBe(false);
  });

  it.each([
    [STORAGE_KEYS.providerId, "coreplyCloud"],
    [STORAGE_KEYS.globalSettings, "{}"],
    [STORAGE_KEYS.selectedApps, "[]"],
  ])("detects a stored %s even when it is the only key", async (key, value) => {
    const { manager, values } = createStore("android");
    values.set(key, value);
    expect(await manager.hasSavedSettings()).toBe(true);
  });
});

describe("CoreplyStorageManager profiles", () => {
  it("defaults to the new cloud provider and preserves a saved provider", async () => {
    const { manager } = createStore("android");
    expect(await manager.loadProviderId()).toBe("coreplyCloudStateful");
    await manager.saveProviderId("coreplyCloud");
    expect(await manager.loadProviderId()).toBe("coreplyCloud");
  });

  it("enables built-in web profiles by default and preserves an empty selection", async () => {
    const { manager } = createStore("web");
    expect(await manager.loadSelectedApps()).toEqual(
      builtInProfiles.filter((profile) => profile.platform === "web").map((profile) => profile.id),
    );
    await manager.saveSelectedApps([]);
    expect(await manager.loadSelectedApps()).toEqual([]);
    expect(await createStore("android").manager.loadSelectedApps()).toEqual([]);
  });

  it("loads built-ins from code without writing them to storage", async () => {
    const { manager, values } = createStore("web");
    const profiles = await manager.loadProfiles();
    expect(profiles).toHaveLength(builtInProfiles.filter((profile) => profile.platform === "web").length);
    expect(values.has(STORAGE_KEYS.profiles)).toBe(false);
    values.set(STORAGE_KEYS.profiles, "[]");
    expect(await manager.loadProfiles()).toEqual(profiles);
  });

  it("rejects deleting built-in web profiles", async () => {
    const { manager } = createStore("web");
    const [profile] = await manager.loadProfiles();
    expect(() => manager.deleteProfile(profile.id)).toThrow("Built-in profiles can only be reset");
  });

  it("deletes web enablement with the profile", async () => {
    const { manager } = createStore("web");
    const [preset] = await manager.loadProfiles();
    const profile = { ...preset, id: "custom" };
    await manager.saveProfile(profile);
    await manager.saveSelectedApps([profile.id]);
    await manager.deleteProfile(profile.id);
    expect(await manager.loadSelectedApps()).toEqual([]);
  });

  it("defaults to installed Android apps with built-in profiles and preserves saved choices", async () => {
    const { manager } = createStore("android");
    const apps = [
      { packageName: "com.whatsapp", appName: "WhatsApp" },
      { packageName: "com.example", appName: "Example" },
    ];
    await manager.prepareAndroidProfiles(apps);
    expect(await manager.loadSelectedApps()).toEqual(["com.whatsapp"]);

    await manager.saveSelectedApps(["com.example"]);
    await manager.prepareAndroidProfiles(apps);
    expect(await manager.loadSelectedApps()).toEqual(["com.example"]);

    await manager.saveSelectedApps([]);
    await manager.prepareAndroidProfiles(apps);
    expect(await manager.loadSelectedApps()).toEqual([]);
  });

  it("prepares only stored Android overrides and purges uninstalled apps", async () => {
    const { manager, values } = createStore("android");
    const apps = [{ packageName: "com.whatsapp", appName: "WhatsApp" }, { packageName: "com.example", appName: "Example" }];
    await manager.prepareAndroidProfiles(apps);
    expect(JSON.parse(values.get(STORAGE_KEYS.profiles)!)).toEqual([]);
    const generic = resolveAndroidProfile(await manager.loadProfiles(), "com.example", "Old name");
    await manager.saveProfile({ ...generic, appSpecificInstruction: "Custom" });
    await manager.saveSelectedApps(["com.example"]);
    await manager.prepareAndroidProfiles(apps);
    expect(JSON.parse(values.get(STORAGE_KEYS.profiles)!)).toEqual([
      { ...generic, displayName: "Example", appSpecificInstruction: "Custom" },
    ]);
    const reset = await manager.resetProfile({ ...generic, displayName: "Example" });
    expect(reset.appSpecificInstruction).toBeUndefined();
    expect(JSON.parse(values.get(STORAGE_KEYS.profiles)!)).toEqual([]);
    await manager.saveProfile({ ...generic, appSpecificInstruction: "Custom" });
    await manager.prepareAndroidProfiles([]);
    expect(JSON.parse(values.get(STORAGE_KEYS.profiles)!)).toEqual([]);
    expect(await manager.loadProfiles()).toEqual(builtInProfiles.filter((profile) => profile.platform === "android"));
    expect(await manager.loadSelectedApps()).toEqual([]);
  });

  it("serializes simultaneous profile writes", async () => {
    const { manager } = createStore("web");
    const profiles = await manager.loadProfiles();
    await Promise.all(profiles.map((profile) => manager.saveProfile({ ...profile, displayName: "Updated" })));
    expect((await manager.loadProfiles()).every((profile) => profile.displayName === "Updated")).toBe(true);
  });

  it("resets Android presets without changing enablement or built-in templates", async () => {
    const { manager, values } = createStore("android");
    const original = resolveAndroidProfile(await manager.loadProfiles(), "com.whatsapp", "WhatsApp");
    await manager.saveProfile({ ...original, contextExtractors: [], appSpecificInstruction: "Custom" });
    await manager.saveSelectedApps([original.id]);
    const reset = await manager.resetProfile(original);
    expect(reset.contextExtractors).toEqual(original.contextExtractors);
    expect(reset.appSpecificInstruction).toBeUndefined();
    expect(reset.displayName).toBe("WhatsApp");
    expect(JSON.parse(values.get(STORAGE_KEYS.profiles)!)).toEqual([]);
    expect(await manager.loadSelectedApps()).toEqual([original.id]);
    expect(builtInProfiles.find((profile) => profile.id === original.id)?.appSpecificInstruction).toBeUndefined();
  });

  it("resets web presets without changing enablement or other profiles", async () => {
    const { manager, values } = createStore("web");
    const [original, ...others] = await manager.loadProfiles();
    const customized = { ...original, displayName: "Custom", contextExtractors: [], appSpecificInstruction: "Custom" };
    await manager.saveProfile(customized);
    await manager.saveSelectedApps([original.id]);
    const reset = await manager.resetProfile(customized);
    expect(reset).toEqual(original);
    expect(await manager.loadProfiles()).toEqual([original, ...others]);
    expect(JSON.parse(values.get(STORAGE_KEYS.profiles)!)).toEqual([]);
    expect(await manager.loadSelectedApps()).toEqual([original.id]);
    expect(builtInProfiles.find((profile) => profile.id === original.id)?.appSpecificInstruction).toBe(original.appSpecificInstruction);
  });

  it("rejects resetting custom web profiles without changing storage", async () => {
    const { manager, values } = createStore("web");
    const [original] = await manager.loadProfiles();
    const custom = { ...original, id: "custom" };
    await manager.saveProfile(custom);
    const stored = values.get(STORAGE_KEYS.profiles);
    expect(() => manager.resetProfile(custom)).toThrow("Custom web profiles cannot be reset");
    expect(values.get(STORAGE_KEYS.profiles)).toBe(stored);
  });

  it("rejects resetting profiles from another platform", async () => {
    const { manager } = createStore("android");
    const [profile] = await createStore("web").manager.loadProfiles();
    expect(() => manager.resetProfile(profile)).toThrow("Profile platform does not match storage platform");
  });

  it("keeps the ten most recent logs across concurrent appends", async () => {
    const { manager } = createStore("web");
    await Promise.all(Array.from({ length: 12 }, (_, index) => manager.appendSuggestionFetchLog({
      type: "suggestionFetch", providerId: "test", currentTyping: String(index), timestamp: new Date().toISOString(), durationMs: 0, isGood: true, result: { type: "success", suggestion: "Test" },
    })));
    expect((await manager.loadSuggestionFetchLogs()).map((log) => log.currentTyping)).toEqual(Array.from({ length: 10 }, (_, index) => String(index + 2)));
    await manager.clearSuggestionFetchLogs();
    expect(await manager.loadSuggestionFetchLogs()).toEqual([]);
  });
});
