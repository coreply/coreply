import { afterEach, describe, expect, it, vi } from "vitest";

import { Coreply } from "./index";
import { ScreenContextImpl } from "./context/screen";
import type { LibCoreplyListener, SuggestionFetchLog } from "./listener";
import type { Profile } from "./profile";
import { providerDefinitions } from "./providers";
import { createDefaultGlobalSettings } from "./settings";

const TEST_PROVIDER_ID = "__testProvider__";

const testProfile: Profile = {
  id: "test",
  platform: "web",
  dropRule: { differentProfile: 0, sameProfile: 1 },
  extractors: [],
};

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
      createInstance: () => ({ request: requestFunc }),
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
        testProfile,
        { text: "screen", children: [] },
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
      createInstance: () => ({ request: requestFunc }),
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
        testProfile,
        { text: "screen", children: [] },
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
      createInstance: () => ({ request: requestFunc }),
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
      createInstance: () => ({ request: requestFunc }),
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

describe("Coreply provider instance continuity", () => {
  afterEach(() => {
    delete (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID];
  });

  it("preserves the instance for structurally equal config with reordered keys", () => {
    const createInstance = vi.fn(() => ({ request: vi.fn() }));
    (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID] = {
      createInstance,
    };

    const coreply = new Coreply(createListener([], []));
    coreply.updateSettings({
      providerId: TEST_PROVIDER_ID,
      providerConfig: { model: "test", provider: { apiKey: "key", baseURL: "url" } },
    });
    coreply.updateSettings({
      providerConfig: { provider: { baseURL: "url", apiKey: "key" }, model: "test" },
    });
    expect(createInstance).toHaveBeenCalledTimes(1);

    coreply.updateSettings({
      providerConfig: { provider: { baseURL: "url", apiKey: "changed" }, model: "test" },
    });
    expect(createInstance).toHaveBeenCalledTimes(2);
  });

  it("replaces and clears the debounce function only when its delay changes", () => {
    const coreply = new Coreply(createListener([], []));
    const previous = coreply["fetchSuggestionDebounced"];
    const clear = vi.spyOn(previous, "clear");

    coreply.updateSettings({ selectedApps: ["com.example.app"] });
    coreply.updateSettings({ globalSettings: createDefaultGlobalSettings() });
    expect(coreply["fetchSuggestionDebounced"]).toBe(previous);
    expect(clear).not.toHaveBeenCalled();

    const settings = createDefaultGlobalSettings();
    settings.fetchControl.debounceMs = 100;
    coreply.updateSettings({ globalSettings: settings });
    expect(coreply["fetchSuggestionDebounced"]).not.toBe(previous);
    expect(clear).toHaveBeenCalledTimes(1);
    clear.mockRestore();
  });

  it("reuses an instance across requests and replaces it when provider config changes or reset is called", async () => {
    const instanceRequest = vi
      .fn()
      .mockResolvedValueOnce("Hi there")
      .mockResolvedValueOnce("Hi again")
      .mockResolvedValueOnce("Hi reset");
    const createInstance = vi.fn(() => ({
      request: instanceRequest,
    }));

    (providerDefinitions as Record<string, unknown>)[TEST_PROVIDER_ID] = {
      requestFunc: vi.fn(),
      createInstance,
    };

    const coreply = new Coreply(createListener([], []));
    const settings = createDefaultGlobalSettings();
    settings.fetchControl.debounceMs = 0;

    coreply.updateSettings({
      globalSettings: settings,
      providerId: TEST_PROVIDER_ID,
      providerConfig: { a: 1 },
      selectedApps: [],
    });

    coreply["store"].addContext(new ScreenContextImpl(testProfile, { text: "screen", children: [] }));

    coreply.updateTyping("Hi");
    await vi.waitFor(() => {
      expect(instanceRequest).toHaveBeenCalledTimes(1);
    });

    coreply["store"].clearSuggestionPending("Hi");
    coreply["store"].clearSuggestions();
    coreply.updateTyping("Hey");
    await vi.waitFor(() => {
      expect(instanceRequest).toHaveBeenCalledTimes(2);
    });

    expect(createInstance).toHaveBeenCalledTimes(1);

    coreply.updateSettings({ globalSettings: createDefaultGlobalSettings() });
    expect(createInstance).toHaveBeenCalledTimes(1);

    coreply.updateSettings({ providerConfig: { a: 2 } });
    expect(createInstance).toHaveBeenCalledTimes(2);

    coreply.reset();
    expect(createInstance).toHaveBeenCalledTimes(3);
  });
});
