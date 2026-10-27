import { storage } from "#imports";
import { browser } from "wxt/browser";
import { createCoreplyRuntime } from "coreply-wrapper/runtime";
import { wrapperInboundMessageSchema, type WrapperOutboundMessage } from "coreply-wrapper/schemas";
import {
  GLOBAL_SETTINGS_KEY, MASTER_SWITCH_KEY, PROVIDER_ID_KEY, SELECTED_APPS_KEY,
  PROFILES_KEY, getProviderConfigKey,
} from "../runtime/settings";
import { storageManager } from "../runtime/storage-manager";
import { appendSuggestionFetchLog } from "../runtime/troubleshooting";

export default defineBackground(() => {
  let source: { tabId: number; documentId: string } | undefined;
  let enabled = false;
  let watchedProviderConfigKey = "";
  let unwatchProviderConfig = () => {};
  const runtime = createCoreplyRuntime((message) => {
    if (message.type === "log") {
      void appendSuggestionFetchLog(message.payload);
      return;
    }
    if (message.type === "init" || !enabled || !source) return;
    void sendToContentScript(source, message);
  }, import.meta.env.VITE_COREPLY_CLOUD_URL);

  async function sendToContentScript(target: { tabId: number; documentId: string }, message: WrapperOutboundMessage) {
    try {
      await browser.tabs.sendMessage(target.tabId, message, { documentId: target.documentId });
    } catch {
      // Navigation and content-script teardown legitimately remove receivers.
    }
  }

  async function loadSettings() {
    const [settings, masterSwitch] = await Promise.all([
      storageManager.loadSettings(),
      storageManager.loadMasterSwitch(),
    ]);
    enabled = masterSwitch;
    runtime.nativeToLib({ type: "settings", payload: settings });
    const key = getProviderConfigKey(settings.providerId);
    if (watchedProviderConfigKey !== key) {
      unwatchProviderConfig();
      watchedProviderConfigKey = key;
      unwatchProviderConfig = storage.watch<string>(key, refresh);
    }
  }

  const initialization = loadSettings();

  function refresh() {
    void loadSettings().catch(reportError);
  }

  function reportError(error: unknown) {
    console.error("Coreply background operation failed", error instanceof Error ? error.message : String(error));
  }

  browser.runtime.onMessage.addListener((raw: unknown, sender, reply) => {
    const parsed = wrapperInboundMessageSchema.safeParse(raw);
    if (!parsed.success || sender.id !== browser.runtime.id || sender.frameId !== 0 || sender.tab?.id === undefined || !sender.documentId) return;
    const target = { tabId: sender.tab.id, documentId: sender.documentId };
    const handle = async () => {
      await initialization;
      if (!enabled) return;
      const message = parsed.data;
      // Content scripts never control settings or provider credentials.
      if (message.type === "updateTyping" || message.type === "snapshotUpdated") {
        source = target;
        runtime.nativeToLib(message);
      }
    };
    void handle().then(() => reply({ ok: true })).catch((error: unknown) => {
      reportError(error);
      reply({ ok: false });
    });
    return true;
  });

  for (const key of [GLOBAL_SETTINGS_KEY, MASTER_SWITCH_KEY, PROVIDER_ID_KEY, SELECTED_APPS_KEY, PROFILES_KEY]) {
    storage.watch<string>(key, refresh);
  }
  void initialization.catch(reportError);
});
