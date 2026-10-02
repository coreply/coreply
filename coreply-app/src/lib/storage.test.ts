import { describe, expect, it } from "vitest";
import { CoreplyStorageManager, STORAGE_KEYS } from "./storage";
import { builtInProfiles } from "libcoreply";

function createStore(platform: "android" | "web") {
  const values = new Map<string, string>();
  const manager = new CoreplyStorageManager({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  }, platform);
  return { manager, values };
}

describe("CoreplyStorageManager profiles", () => {
  it("initializes web once and preserves an explicitly empty list", async () => {
    const { manager, values } = createStore("web");
    const profiles = await manager.loadProfiles();
    expect(profiles).toHaveLength(builtInProfiles.filter((profile) => profile.platform === "web").length);
    for (const profile of profiles) await manager.deleteProfile(profile.id);
    expect(values.has(STORAGE_KEYS.profiles)).toBe(true);
    expect(await manager.loadProfiles()).toEqual([]);
  });

  it("deletes web enablement with the profile", async () => {
    const { manager } = createStore("web");
    const [profile] = await manager.loadProfiles();
    await manager.saveSelectedApps([profile.id]);
    await manager.deleteProfile(profile.id);
    expect(await manager.loadSelectedApps()).toEqual([]);
  });

  it("copies Android presets, keeps generic defaults ephemeral, and purges uninstalled apps", async () => {
    const { manager } = createStore("android");
    const apps = [{ packageName: "com.whatsapp", appName: "WhatsApp" }, { packageName: "com.example", appName: "Example" }];
    const profiles = await manager.prepareAndroidProfiles(apps);
    expect(profiles.map((profile) => profile.id)).toEqual(["com.whatsapp", "com.example"]);
    expect(await manager.loadProfiles()).toHaveLength(1);
    await manager.saveProfile({ ...profiles[1], appSpecificInstruction: "Custom" });
    await manager.saveSelectedApps(["com.example"]);
    expect(await manager.loadProfiles()).toHaveLength(2);
    const reset = await manager.resetAndroidProfile("com.example", "Example");
    expect(reset.appSpecificInstruction).toBeUndefined();
    expect(await manager.loadProfiles()).toHaveLength(1);
    await manager.prepareAndroidProfiles([]);
    expect(await manager.loadProfiles()).toEqual([]);
    expect(await manager.loadSelectedApps()).toEqual([]);
  });

  it("serializes simultaneous profile writes", async () => {
    const { manager } = createStore("web");
    const profiles = await manager.loadProfiles();
    await Promise.all(profiles.map((profile) => manager.saveProfile({ ...profile, displayName: "Updated" })));
    expect((await manager.loadProfiles()).every((profile) => profile.displayName === "Updated")).toBe(true);
  });

  it("resets Android presets without changing enablement or built-in templates", async () => {
    const { manager } = createStore("android");
    const [original] = await manager.prepareAndroidProfiles([{ packageName: "com.whatsapp", appName: "WhatsApp" }]);
    await manager.saveProfile({ ...original, contextExtractors: [], appSpecificInstruction: "Custom" });
    await manager.saveSelectedApps([original.id]);
    const reset = await manager.resetAndroidProfile(original.id, "WhatsApp");
    expect(reset.contextExtractors).toEqual(original.contextExtractors);
    expect(reset.appSpecificInstruction).toBeUndefined();
    expect(await manager.loadSelectedApps()).toEqual([original.id]);
    expect(builtInProfiles.find((profile) => profile.id === original.id)?.appSpecificInstruction).toBeUndefined();
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
