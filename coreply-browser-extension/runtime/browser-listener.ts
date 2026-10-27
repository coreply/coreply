import {
  findEditableFromElement,
  getDeepActiveElement,
  getSuggestionInsertion,
  getTypingBeforeCursor,
  insertSuggestionText,
  isCaretAtEnd,
  type SupportedEditable,
} from "./editor";
import { browser } from "wxt/browser";
import { storage } from "#imports";
import { matchesProfile } from "libcoreply";
import { storageManager } from "./storage-manager";
import { GLOBAL_SETTINGS_KEY, MASTER_SWITCH_KEY, SELECTED_APPS_KEY, PROFILES_KEY } from "./settings";
import { observeWebSnapshot, serializeWebSnapshot } from "./snapshot";
import {
  clearSuggestionOverlay,
  createSuggestionOverlay,
  positionSuggestionOverlay,
  setSuggestionText,
} from "./ui";
import { wrapperOutboundMessageSchema, type WrapperInboundMessage } from "coreply-wrapper/schemas";
import type { WebSnapshot } from "libcoreply/src/context/snapshot";

export async function startBrowserListener() {
  window.__coreplyBrowserExtensionCleanup?.();

  const overlay = createSuggestionOverlay();
  document.body.append(overlay.inline, overlay.trailing);

  let activeEditable: SupportedEditable | null = null;
  let currentTyping = "";
  let currentSuggestion = "";
  let isComposing = false;
  let isEnabled = false;
  let currentUrl = location.href;
  let collectionMode: "minimal" | "frequent" | "active" = "minimal";
  let pendingTyping: { editable: SupportedEditable; text: string } | null = null;
  let suggestionPresentationType: "inline" | "overlay" | "both" = "both";

  const isForeground = () => document.visibilityState === "visible" && document.hasFocus();

  function sendToBackground(message: WrapperInboundMessage) {
    void browser.runtime.sendMessage(message).catch(() => clearOverlay());
  }

  function sendCoreplyEvent(message: WrapperInboundMessage) {
    if (!isEnabled || !isForeground()) return;
    sendToBackground(message);
  }

  // Collection-only proxy. The shared runtime executes in the background.
  const coreply = {
    updateTyping(currentTyping: string) { sendCoreplyEvent({ type: "updateTyping", payload: { currentTyping } }); },
    snapshotUpdated(snapshot: WebSnapshot) { sendCoreplyEvent({ type: "snapshotUpdated", payload: { snapshot } }); },
  };

  function showSuggestion(fullSuggestion: string) {
      if (
        !isEnabled ||
        !isForeground() ||
        isComposing ||
        collectionMode !== "active" ||
        !activeEditable?.isConnected ||
        getDeepActiveElement() !== activeEditable ||
        !isCaretAtEnd(activeEditable)
      ) {
        clearOverlay();
        return;
      }

      // Stale responses must not clear a valid suggestion already on screen.
      if (!fullSuggestion.startsWith(currentTyping)) {
        return;
      }

      const suffix = fullSuggestion.slice(currentTyping.length);
      if (!suffix.trim()) {
        return;
      }

      currentSuggestion = suffix;
      setSuggestionText(overlay, {
        inline: suggestionPresentationType === "overlay" ? "" : suffix,
        trailing: suggestionPresentationType === "inline" ? "" : suffix,
      });
      positionOverlay();
  }

  function onBackgroundMessage(raw: unknown): undefined {
    const parsed = wrapperOutboundMessageSchema.safeParse(raw);
    if (!parsed.success) return;
    const message = parsed.data;
    if (!isForeground() || !isEnabled) return;
    switch (message.type) {
      case "updateSuggestion": showSuggestion(message.payload.fullSuggestion); break;
      case "collectionModeUpdated":
        collectionMode = message.payload.collectionMode;
        if (collectionMode !== "active") clearOverlay();
        flushPendingTyping();
        break;
      case "clearSuggestion":
      case "error": clearOverlay(); break;
    }
  }

  async function loadSettings() {
    const [settings, enabled] = await Promise.all([
      storageManager.loadSettings(),
      storageManager.loadMasterSwitch(),
    ]);
    isEnabled = enabled && settings.profiles.some((profile) =>
      settings.selectedApps.includes(profile.id) && matchesProfile(profile, "web", location.href),
    );
    suggestionPresentationType = settings.globalSettings.presentation.suggestionPresentationType;
    if (!isEnabled) clearState();
    else onForegroundChanged();
  }

  function refreshSettings() {
    void loadSettings().catch(() => {
      isEnabled = false;
      clearState();
    });
  }

  function onForegroundChanged() {
    if (isForeground()) {
      syncFromFocusedEditable();
      if (!pendingTyping) updateSnapshot();
    } else {
      clearState();
    }
  }

  function clearOverlay() {
    currentSuggestion = "";
    setSuggestionText(overlay, { inline: "", trailing: "" });
    clearSuggestionOverlay(overlay);
  }

  function clearState() {
    activeEditable = null;
    currentTyping = "";
    clearOverlay();
    pendingTyping = null;
    collectionMode = "minimal";
  }

  // Once a profile identifies the supported composer, forward typing without
  // waiting for subsequent context extraction.
  function flushPendingTyping() {
    if (!pendingTyping || !isEnabled || !isForeground() || isComposing) {
      return;
    }

    const { editable, text } = pendingTyping;
    if (
      collectionMode === "active" &&
      activeEditable === editable &&
      editable.isConnected &&
      getDeepActiveElement() === editable &&
      currentTyping === text
    ) {
      pendingTyping = null;
      coreply.updateTyping(text);
    }
  }

  function positionOverlay() {
    positionSuggestionOverlay(
      overlay,
      activeEditable,
      currentSuggestion,
      !currentTyping.trim(),
      suggestionPresentationType,
    );
  }

  function updateSuggestion(nextTyping: string) {
    clearOverlay();
    if (!activeEditable) return;
    if (collectionMode === "active") {
      pendingTyping = null;
      coreply.updateTyping(nextTyping);
      return;
    }
    pendingTyping = { editable: activeEditable, text: nextTyping };
    updateSnapshot();
  }

  function syncFromFocusedEditable() {
    if (!isEnabled || !isForeground()) {
      clearState();
      return;
    }

    if (isComposing) {
      return;
    }

    const editable = findEditableFromElement(getDeepActiveElement());
    if (!editable || !editable.isConnected) {
      if (activeEditable) {
        pendingTyping = null;
        collectionMode = "minimal";
      }
      activeEditable = null;
      currentTyping = "";
      clearOverlay();
      return;
    }

    if (activeEditable && activeEditable !== editable) {
      pendingTyping = null;
      collectionMode = "minimal";
      currentTyping = "";
      clearOverlay();
    }
    activeEditable = editable;

    const nextTyping = getTypingBeforeCursor(editable);
    if (nextTyping === null) {
      currentTyping = "";
      clearOverlay();
      pendingTyping = null;
      collectionMode = "minimal";
      return;
    }

    if (nextTyping !== currentTyping) {
      currentTyping = nextTyping;
      updateSuggestion(nextTyping);
      return;
    }

    if (collectionMode === "active" && !nextTyping.trim() && !currentSuggestion) {
      coreply.updateTyping("");
    }
    positionOverlay();
  }

  function updateSnapshot() {
    if (currentUrl !== location.href) {
      currentUrl = location.href;
      clearState();
      refreshSettings();
      return;
    }
    if (!isEnabled || !isForeground() || isComposing) return;
    coreply.snapshotUpdated({
      platform: "web",
      url: location.href,
      snapshot: serializeWebSnapshot(document.documentElement),
    });
  }

  const onNavigation = () => {
    currentUrl = location.href;
    clearState();
    refreshSettings();
  };

  const onInput = () => {
    syncFromFocusedEditable();
  };

  const onSelectionChange = () => {
    syncFromFocusedEditable();
  };

  const onFocusIn = () => {
    syncFromFocusedEditable();
    if (!pendingTyping) updateSnapshot();
  };

  const onFocusOut = () => {
    window.setTimeout(() => {
      syncFromFocusedEditable();
      if (!pendingTyping) updateSnapshot();
    }, 0);
  };

  const onScrollOrResize = () => {
    if (!isEnabled) {
      return;
    }

    positionOverlay();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const acceptAll =
      event.key === "Tab" &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey;
    const acceptNextWord =
      event.key === "ArrowRight" &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !event.altKey;
    if (
      !isEnabled ||
      isComposing ||
      event.isComposing ||
      (!acceptAll && !acceptNextWord)
    ) {
      return;
    }

    if (
      !activeEditable ||
      getDeepActiveElement() !== activeEditable ||
      !isCaretAtEnd(activeEditable) ||
      !currentSuggestion
    ) {
      return;
    }

    const { insertedText, remainingSuggestion } = acceptAll
      ? { insertedText: currentSuggestion, remainingSuggestion: "" }
      : getSuggestionInsertion(currentSuggestion);

    if (!insertedText) {
      return;
    }

    if (!insertSuggestionText(activeEditable, insertedText)) {
      return;
    }

    event.preventDefault();
    currentSuggestion = remainingSuggestion;
    setSuggestionText(overlay, {
      inline: suggestionPresentationType === "overlay" ? "" : remainingSuggestion,
      trailing: suggestionPresentationType === "inline" ? "" : remainingSuggestion,
    });
    syncFromFocusedEditable();
  };

  const onCompositionStart = () => {
    isComposing = true;
    pendingTyping = null;
    clearOverlay();
  };

  const onCompositionEnd = () => {
    isComposing = false;
    syncFromFocusedEditable();
    if (!pendingTyping) updateSnapshot();
  };

  const stopObservingSnapshots = observeWebSnapshot(
    document.documentElement,
    updateSnapshot,
    () => collectionMode === "active" ? activeEditable : null,
  );

  const unwatchSettings = [GLOBAL_SETTINGS_KEY, MASTER_SWITCH_KEY, SELECTED_APPS_KEY, PROFILES_KEY]
    .map((key) => storage.watch<string>(key, refreshSettings));

  document.addEventListener("input", onInput, true);
  browser.runtime.onMessage.addListener(onBackgroundMessage);
  document.addEventListener("visibilitychange", onForegroundChanged);
  window.addEventListener("focus", onForegroundChanged);
  window.addEventListener("blur", onForegroundChanged);
  document.addEventListener("selectionchange", onSelectionChange, true);
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);
  document.addEventListener("compositionstart", onCompositionStart, true);
  document.addEventListener("compositionend", onCompositionEnd, true);
  window.addEventListener("popstate", onNavigation);
  window.addEventListener("hashchange", onNavigation);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize, true);

  window.__coreplyBrowserExtensionCleanup = () => {
    for (const unwatch of unwatchSettings) unwatch();
    browser.runtime.onMessage.removeListener(onBackgroundMessage);
    document.removeEventListener("visibilitychange", onForegroundChanged);
    window.removeEventListener("focus", onForegroundChanged);
    window.removeEventListener("blur", onForegroundChanged);
    document.removeEventListener("input", onInput, true);
    document.removeEventListener("selectionchange", onSelectionChange, true);
    document.removeEventListener("focusin", onFocusIn, true);
    document.removeEventListener("focusout", onFocusOut, true);
    document.removeEventListener(
      "compositionstart",
      onCompositionStart,
      true,
    );
    document.removeEventListener("compositionend", onCompositionEnd, true);
    window.removeEventListener("popstate", onNavigation);
    window.removeEventListener("hashchange", onNavigation);
    stopObservingSnapshots();
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize, true);
    clearState();
    overlay.inline.remove();
    overlay.trailing.remove();
    delete window.__coreplyBrowserExtensionCleanup;
  };

  refreshSettings();
}
