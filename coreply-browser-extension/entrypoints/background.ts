import { storage } from "#imports";
import { browser } from "wxt/browser";
import { createCoreplyRuntime } from "coreply-wrapper/runtime";
import { wrapperInboundMessageSchema, type WrapperOutboundMessage } from "coreply-wrapper/schemas";
import {
  GLOBAL_SETTINGS_KEY, MASTER_SWITCH_KEY, PROVIDER_ID_KEY, SELECTED_APPS_KEY,
  PROFILES_KEY, getProviderConfigKey,
} from "../runtime/settings";
import { storageManager } from "../runtime/storage-manager";
import { providerDefinitions } from "libcoreply";
import { appendSuggestionFetchLog } from "../runtime/troubleshooting";

const SETTINGS_SCHEMA_VERSION_KEY = "local:coreply.migrations.settingsSchemaVersion";
const INITIAL_SETTINGS_SCHEMA_VERSION = 1;

async function initializeSettingsSchemaVersion() {
  const version = await storage.getItem<number>(SETTINGS_SCHEMA_VERSION_KEY);
  if (version === null) {
    await storage.setItem(SETTINGS_SCHEMA_VERSION_KEY, INITIAL_SETTINGS_SCHEMA_VERSION);
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      const url = new URL(browser.runtime.getURL("/popup.html"));
      url.searchParams.set("onboarding", "true");
      void browser.tabs.create({ url: url.href });
    }
  });

  let source: { tabId: number; documentId: string } | undefined;
  let enabled = false;
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

  }

  const initialization = initializeSettingsSchemaVersion().then(loadSettings);

  function refresh() {
    void initialization.then(loadSettings).catch(reportError);
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
  for (const id of Object.keys(providerDefinitions)) {
    storage.watch<string>(getProviderConfigKey(id), refresh);
  }
  void initialization.catch(reportError);
});
