import { afterEach, describe, expect, it, vi } from "vitest";

import { Coreply } from "./index";
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
    const requestFunc = vi.fn().mockResolvedValue(" there");
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
      expect(logs).toHaveLength(1);
    });

    expect(requestFunc).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(0);
    expect(logs[0]).toMatchObject({
      type: "suggestionFetch",
      providerId: TEST_PROVIDER_ID,
      currentTyping: "Hi",
      contexts: [],
      result: {
        type: "success",
        suggestion: " there",
      },
    });
    expect(logs[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});
