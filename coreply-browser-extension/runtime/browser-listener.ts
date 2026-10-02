import { storage } from "#imports";
import {
  findEditableFromElement,
  getDeepActiveElement,
  getSuggestionInsertion,
  getTypingBeforeCursor,
  insertSuggestionText,
  isCaretAtEnd,
  type SupportedEditable,
} from "./editor";
import {
  GLOBAL_SETTINGS_KEY,
  MASTER_SWITCH_KEY,
  PROVIDER_ID_KEY,
  SELECTED_APPS_KEY,
  PROFILES_KEY,
  getProviderConfigKey,
  syncCoreplySettings,
} from "./settings";
import { observeWebSnapshot, serializeWebSnapshot } from "./snapshot";
import {
  clearSuggestionOverlay,
  createSuggestionOverlay,
  positionSuggestionOverlay,
  setSuggestionText,
} from "./ui";
import { appendSuggestionFetchLog } from "./troubleshooting";
import { Coreply } from "../../libcoreply/src";

export async function startBrowserListener() {
  window.__coreplyBrowserExtensionCleanup?.();

  const overlay = createSuggestionOverlay();
  document.body.append(overlay.inline, overlay.trailing);

  let activeEditable: SupportedEditable | null = null;
  let currentTyping = "";
  let currentSuggestion = "";
  let isComposing = false;
  let isEnabled = true;
  let currentUrl = location.href;
  let collectionMode: "minimal" | "frequent" | "active" = "minimal";
  let pendingTyping: { editable: SupportedEditable; text: string } | null = null;
  let suggestionPresentationType: "inline" | "overlay" | "both" = "both";

  const coreply = new Coreply({
    onInit() {},
    onCollectionModeUpdated(mode) {
      collectionMode = mode;
      if (mode !== "active") {
        clearOverlay();
      }
      queueMicrotask(flushPendingTyping);
    },
    onSuggestionUpdated(fullSuggestion) {
      if (
        !isEnabled ||
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
    },
    onSuggestionCleared() {
      clearOverlay();
    },
    onError() {
      clearOverlay();
    },
    onLog(log) {
      void appendSuggestionFetchLog(log);
    },
  });

  let watchedProviderConfigKey = "";
  let unwatchProviderConfig = () => {};

  function clearOverlay() {
    currentSuggestion = "";
    setSuggestionText(overlay, { inline: "", trailing: "" });
    clearSuggestionOverlay(overlay);
  }

  function watchProviderConfig(providerId: string) {
    const nextProviderConfigKey = getProviderConfigKey(providerId);
    if (nextProviderConfigKey === watchedProviderConfigKey) {
      return;
    }

    unwatchProviderConfig();
    watchedProviderConfigKey = nextProviderConfigKey;
    unwatchProviderConfig = storage.watch<string>(nextProviderConfigKey, () => {
      void syncSettingsAndRefreshSuggestion();
    });
  }

  function clearState() {
    activeEditable = null;
    currentTyping = "";
    clearOverlay();
    pendingTyping = null;
    collectionMode = "minimal";
  }

  // Typing must not trigger a fetch before the latest snapshot's context is
  // committed, and it only reaches Coreply when the profile reports the
  // supported composer is focused (active mode), matching Android where
  // typing updates only flow in active mode. The microtask lets the
  // extractor finish adding the context first.
  function flushPendingTyping() {
    if (!pendingTyping || !isEnabled || isComposing) {
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

  async function syncSettings() {
    isEnabled = await syncCoreplySettings(coreply);
    suggestionPresentationType =
      coreply.getSettings().globalSettings.presentation.suggestionPresentationType;
    if (isEnabled) {
      watchProviderConfig(coreply.getSettings().providerId);
    }
  }

  async function syncSettingsAndRefreshSuggestion() {
    await syncSettings();

    if (!isEnabled) {
      clearState();
      return;
    }

    pendingTyping = null;
    collectionMode = "minimal";
    currentTyping = "";
    clearOverlay();
    syncFromFocusedEditable();
    if (!pendingTyping) updateSnapshot();
  }

  await syncSettings();

  const unwatchGlobalSettings = storage.watch<string>(
    GLOBAL_SETTINGS_KEY,
    () => {
      void syncSettingsAndRefreshSuggestion();
    },
  );

  const unwatchMasterSwitch = storage.watch<string>(MASTER_SWITCH_KEY, () => {
    void syncSettingsAndRefreshSuggestion();
  });

  const unwatchProviderId = storage.watch<string>(PROVIDER_ID_KEY, () => {
    void syncSettingsAndRefreshSuggestion();
  });

  const unwatchSelectedApps = storage.watch<string>(SELECTED_APPS_KEY, () => {
    void syncSettingsAndRefreshSuggestion();
  });
  const unwatchProfiles = storage.watch<string>(PROFILES_KEY, () => {
    void syncSettingsAndRefreshSuggestion();
  });

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
    if (!isEnabled) {
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
      coreply.reset();
      void syncSettingsAndRefreshSuggestion();
      return;
    }
    if (!isEnabled || isComposing) return;
    coreply.snapshotUpdated({
      platform: "web",
      url: location.href,
      snapshot: serializeWebSnapshot(document.documentElement),
    });
  }

  const onNavigation = () => {
    currentUrl = location.href;
    coreply.reset();
    void syncSettingsAndRefreshSuggestion();
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

  document.addEventListener("input", onInput, true);
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
    unwatchGlobalSettings();
    unwatchMasterSwitch();
    unwatchProviderId();
    unwatchSelectedApps();
    unwatchProfiles();
    unwatchProviderConfig();
    clearState();
    overlay.inline.remove();
    overlay.trailing.remove();
    delete window.__coreplyBrowserExtensionCleanup;
  };

  syncFromFocusedEditable();
  if (!pendingTyping) updateSnapshot();
}
