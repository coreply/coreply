import { describe, expect, it, vi } from "vitest";
import { Coreply } from "../index";
import { createDefaultGlobalSettings } from "../settings";
import type { AndroidSnapshot, WebSnapshot } from "../context/snapshot";
import { builtInProfiles, type Profile } from ".";

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
    snapshot: { id: "", tagName: "BODY", text: null, ariaLabel: null, role: null, placeholder: null, name: null, className: null, attributes: {}, isEditable: false, isContentEditable: false, isFocused: false, isVisible: true, bounds: { left: 0, top: 0, right: 0, bottom: 0 }, children: [] },
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
  it("uses Android built-ins before installed-app preparation has run", async () => {
    const { coreply } = createCoreply(["com.whatsapp"]);
    coreply.updateSettings({ profiles: [] });
    const page: AndroidSnapshot = {
      platform: "android",
      snapshot: {
        packageName: "com.whatsapp",
        isEditable: false, isFocused: false, isVisibleToUser: true, isShowingHintText: false,
        bounds: { left: 0, top: 0, right: 100, bottom: 200 },
        children: [],
      },
    };
    page.snapshot.children = [{
      ...page.snapshot,
      id: "com.whatsapp:id/entry",
      className: "android.widget.EditText",
      text: "Hello",
      isEditable: true,
      isFocused: true,
    }];
    coreply.snapshotUpdated(page);
    await vi.waitFor(() => expect(coreply["store"].getContexts()).toHaveLength(1));
    expect(coreply["store"].getLatestContext()?.type).toBe("chat");
  });

  it("uses built-in extractors without stored profiles", async () => {
    const preset = builtInProfiles.find((profile) => profile.id === "chatgpt-web-chat")!;
    const { coreply } = createCoreply([preset.id]);
    coreply.updateSettings({ profiles: [] });
    const page = snapshot("https://chatgpt.com/");
    page.snapshot.children = [{ ...page.snapshot, id: "mobile-composer-prompt", isFocused: true }];
    coreply.snapshotUpdated(page);
    await vi.waitFor(() => expect(coreply["store"].getContexts()).toHaveLength(1));
    expect(coreply["store"].getLatestContext()?.type).toBe("chat");
  });

  it("does not replace a stored empty override with built-in extractors", async () => {
    const preset = builtInProfiles.find((profile) => profile.id === "chatgpt-web-chat")!;
    const { coreply, mode } = createCoreply([preset.id]);
    coreply.updateSettings({ profiles: [{ ...preset, contextExtractors: [] }] });
    const page = snapshot("https://chatgpt.com/");
    page.snapshot.children = [{ ...page.snapshot, id: "mobile-composer-prompt", isFocused: true }];
    coreply.snapshotUpdated(page);
    await vi.waitFor(() => expect(mode).toHaveBeenLastCalledWith("minimal"));
    expect(coreply["store"].getContexts()).toHaveLength(0);
  });

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
