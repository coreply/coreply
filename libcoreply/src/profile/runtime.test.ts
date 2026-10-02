import { describe, expect, it, vi } from "vitest";
import { Coreply } from "../index";
import { createDefaultGlobalSettings } from "../settings";
import type { WebSnapshot } from "../context/snapshot";
import type { Profile } from ".";

const profile: Profile = {
  id: "user-profile",
  platform: "web",
  matchingRule: "^https://example\\.com/chat/",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  contextExtractors: [{
    extractor: '{"type":"screen","text":"Hello","children":[],"snapshotFrequency":"active"}',
    contextTemplate: "Extracted {{data.text}}",
  }],
};

function snapshot(url: string): WebSnapshot {
  return {
    platform: "web", url,
    snapshot: { id: "", tagName: "BODY", text: null, ariaLabel: null, placeholder: null, name: null, className: null, attributes: {}, isEditable: false, isContentEditable: false, isFocused: false, isVisible: true, children: [] },
  };
}

function createCoreply(selectedApps: string[]) {
  const mode = vi.fn();
  const coreply = new Coreply({ onInit() {}, onCollectionModeUpdated: mode, onSuggestionUpdated() {}, onSuggestionCleared() {}, onError() {}, onLog() {} });
  const settings = createDefaultGlobalSettings();
  settings.fetchControl.typingRegexEnabled = true;
  settings.fetchControl.typingRegexPattern = "^NEVER$";
  coreply.updateSettings({ profiles: [profile], selectedApps, globalSettings: settings });
  return { coreply, mode };
}

describe("user profile evaluation", () => {
  it("requires both profile enablement and a matching full URL", async () => {
    const { coreply, mode } = createCoreply([]);
    coreply.snapshotUpdated(snapshot("https://example.com/chat/123"));
    expect(mode).toHaveBeenLastCalledWith("minimal");
    coreply.updateSettings({ selectedApps: [profile.id] });
    coreply.snapshotUpdated(snapshot("https://example.com/settings"));
    expect(coreply["store"].getContexts()).toHaveLength(0);
    coreply.snapshotUpdated(snapshot("https://example.com/chat/123"));
    await vi.waitFor(() => expect(coreply["store"].getContexts()).toHaveLength(1));
    expect(coreply["store"].getLatestContext()?.renderPrompt()).toBe("Extracted Hello");
    expect(mode).toHaveBeenLastCalledWith("active");
  });

  it("does not commit an in-flight extraction after disabling a profile", async () => {
    const { coreply } = createCoreply([profile.id]);
    coreply.snapshotUpdated(snapshot("https://example.com/chat/123"));
    coreply.updateSettings({ selectedApps: [] });
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    expect(coreply["store"].getContexts()).toHaveLength(0);
  });
});
