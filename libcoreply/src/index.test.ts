import { afterEach, describe, expect, it, vi } from "vitest";

import { Coreply } from "./index";
import { ScreenContextImpl } from "./context/screen";
import type { LibCoreplyListener, SuggestionFetchLog } from "./listener";
import { providerDefinitions } from "./providers";
import { createDefaultGlobalSettings } from "./settings";

const TEST_PROVIDER_ID = "__testProvider__";

function createListener(logs: SuggestionFetchLog[], errors: Error[]) {
  return {
    onCollectionModeUpdated() {},
    onInit() {},
    onSuggestionUpdated() {},
    onSuggestionCleared() {},
    onError(error) {
      errors.push(error);
    },
    onLog(log) {
      logs.push(log);
    },
  } satisfies LibCoreplyListener;
}

describe("Coreply suggestion fetch logging", () => {
  afterEach(() => {
    delete (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID];
  });

  it("emits one success log for a suggestion fetch", async () => {
    const requestFunc = vi.fn().mockResolvedValue("Hi there");
    (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID] = {
      requestFunc,
    };

    const logs: SuggestionFetchLog[] = [];
    const errors: Error[] = [];
    const settings = createDefaultGlobalSettings();
    settings.fetchControl.debounceMs = 0;
    settings.troubleshooting.saveLogs = true;

    const coreply = new Coreply(createListener(logs, errors));
    coreply.updateSettings({
      globalSettings: settings,
      providerId: TEST_PROVIDER_ID,
      providerConfig: {},
      selectedApps: [],
    });
    coreply["store"].addContext(
      new ScreenContextImpl(
        "test",
        { differentProfile: 0, sameProfile: 1 },
        { text: "screen" },
      ),
    );

    coreply.updateTyping("Hi");

    await vi.waitFor(() => {
      expect(logs).toHaveLength(1);
    });

    expect(requestFunc).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(0);
    expect(logs[0]).toMatchObject({
      type: "suggestionFetch",
      providerId: TEST_PROVIDER_ID,
      currentTyping: "Hi",
      isGood: true,
      result: {
        type: "success",
        suggestion: "Hi there",
      },
    });
    expect(logs[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(new Date(logs[0].timestamp).getTime()).not.toBeNaN();
  });

  it("marks a suggestion matching the typed text as not good", async () => {
    const requestFunc = vi.fn().mockResolvedValue("Hi");
    (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID] = {
      requestFunc,
    };

    const logs: SuggestionFetchLog[] = [];
    const errors: Error[] = [];
    const settings = createDefaultGlobalSettings();
    settings.fetchControl.debounceMs = 0;
    settings.troubleshooting.saveLogs = true;

    const coreply = new Coreply(createListener(logs, errors));
    coreply.updateSettings({
      globalSettings: settings,
      providerId: TEST_PROVIDER_ID,
      providerConfig: {},
      selectedApps: [],
    });
    coreply["store"].addContext(
      new ScreenContextImpl(
        "test",
        { differentProfile: 0, sameProfile: 1 },
        { text: "screen" },
      ),
    );

    coreply.updateTyping("Hi");

    await vi.waitFor(() => {
      expect(logs).toHaveLength(1);
    });

    expect(logs[0]).toMatchObject({
      isGood: false,
      result: { type: "success", suggestion: "Hi" },
    });
    expect(errors).toHaveLength(0);
  });

  it("emits one error log for a failed suggestion fetch", async () => {
    const requestFunc = vi.fn().mockRejectedValue(new Error("boom"));
    (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID] = {
      requestFunc,
    };

    const logs: SuggestionFetchLog[] = [];
    const errors: Error[] = [];
    const settings = createDefaultGlobalSettings();
    settings.fetchControl.debounceMs = 0;
    settings.troubleshooting.saveLogs = true;

    const coreply = new Coreply(createListener(logs, errors));
    coreply.updateSettings({
      globalSettings: settings,
      providerId: TEST_PROVIDER_ID,
      providerConfig: {},
      selectedApps: [],
    });

    coreply.updateTyping("Hi");

    await vi.waitFor(() => {
      expect(logs).toHaveLength(1);
      expect(errors).toHaveLength(1);
    });

    expect(requestFunc).toHaveBeenCalledTimes(1);
    expect(logs[0]).toMatchObject({
      type: "suggestionFetch",
      providerId: TEST_PROVIDER_ID,
      currentTyping: "Hi",
      isGood: false,
      result: {
        type: "error",
        message: "boom",
      },
    });
  });

  it("does not emit logs when saving logs is off", async () => {
    const requestFunc = vi.fn().mockResolvedValue("Hi there");
    (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID] = {
      requestFunc,
    };

    const logs: SuggestionFetchLog[] = [];
    const errors: Error[] = [];
    const settings = createDefaultGlobalSettings();
    settings.fetchControl.debounceMs = 0;

    const coreply = new Coreply(createListener(logs, errors));
    coreply.updateSettings({
      globalSettings: settings,
      providerId: TEST_PROVIDER_ID,
      providerConfig: {},
      selectedApps: [],
    });

    coreply.updateTyping("Hi");

    await vi.waitFor(() => {
      expect(requestFunc).toHaveBeenCalledTimes(1);
    });
    expect(logs).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
