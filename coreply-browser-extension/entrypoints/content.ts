import { storage } from "#imports";
import {
  Coreply,
  createDefaultGlobalSettings,
  globalSettingsSchema,
  providerDefinitions,
} from "../../libcoreply/src";

type SupportedEditable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

declare global {
  interface Window {
    __coreplyBrowserExtensionCleanup?: () => void;
  }
}

const OVERLAY_ID = "__coreply_browser_extension_suggestion";
const SUPPORTED_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "url",
  "tel",
]);
const SETTINGS_NAMESPACE = "coreply.settings";
const GLOBAL_SETTINGS_KEY = `local:${SETTINGS_NAMESPACE}.globalSettings`;
const MASTER_SWITCH_KEY = `local:${SETTINGS_NAMESPACE}.masterSwitch`;
const PROVIDER_ID_KEY = `local:${SETTINGS_NAMESPACE}.providerId`;

function getProviderConfigKey(providerId: string) {
  return `local:${SETTINGS_NAMESPACE}.${providerId}.providerConfig` as const;
}

function parseStoredJson(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function parseStoredRecord(value: string | null) {
  const parsed = parseStoredJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  return parsed as Record<string, unknown>;
}

function getSuggestionInsertion(suggestion: string) {
  const match = suggestion.match(/^(\s*\S+)(.*)$/);
  if (!match) {
    return { insertedText: suggestion, remainingSuggestion: "" };
  }

  return {
    insertedText: match[1],
    remainingSuggestion: match[2],
  };
}

function isTextInput(
  element: Element,
): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  return (
    element instanceof HTMLInputElement &&
    SUPPORTED_INPUT_TYPES.has(element.type)
  );
}

function isSupportedEditable(element: Element): element is SupportedEditable {
  return (
    isTextInput(element) ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

function getParentElementAcrossShadow(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }

  const rootNode = element.getRootNode();
  return rootNode instanceof ShadowRoot ? rootNode.host : null;
}

function findEditableFromElement(
  element: Element | null,
): SupportedEditable | null {
  let current = element;
  while (current) {
    if (isSupportedEditable(current)) {
      return current;
    }

    current = getParentElementAcrossShadow(current);
  }

  return null;
}

function getDeepActiveElement(
  root: Document | ShadowRoot = document,
): Element | null {
  let activeElement = root.activeElement;
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  return activeElement;
}

function isNodeWithinElement(node: Node, element: HTMLElement): boolean {
  let current: Node | null = node;
  while (current) {
    if (current === element) {
      return true;
    }

    if (current.parentNode) {
      current = current.parentNode;
      continue;
    }

    const rootNode = current.getRootNode();
    current = rootNode instanceof ShadowRoot ? rootNode.host : null;
  }

  return false;
}

function getTypingFromTextInput(
  element: HTMLInputElement | HTMLTextAreaElement,
): string | null {
  if (element.selectionStart === null || element.selectionEnd === null) {
    return null;
  }

  if (element.selectionStart !== element.selectionEnd) {
    return null;
  }

  return element.value.slice(0, element.selectionStart);
}

function getTypingFromContentEditable(element: HTMLElement): string | null {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!isNodeWithinElement(range.endContainer, element)) {
    return null;
  }

  const textRange = range.cloneRange();
  textRange.selectNodeContents(element);
  textRange.setEnd(range.endContainer, range.endOffset);
  return textRange.toString();
}

function getTypingBeforeCursor(element: SupportedEditable): string | null {
  if (isTextInput(element)) {
    return getTypingFromTextInput(element);
  }

  return getTypingFromContentEditable(element);
}

function getCaretRectFromTextInput(
  element: HTMLInputElement | HTMLTextAreaElement,
): DOMRect | null {
  if (element.selectionStart === null) {
    return null;
  }

  const computedStyle = window.getComputedStyle(element);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");
  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "lineHeight",
    "fontFamily",
    "letterSpacing",
    "textAlign",
    "textTransform",
    "textIndent",
    "tabSize",
    "whiteSpace",
    "wordBreak",
  ] as const;

  for (const property of properties) {
    mirror.style.setProperty(
      property,
      computedStyle.getPropertyValue(property),
    );
  }

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace =
    element instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";

  mirror.textContent = element.value.slice(0, element.selectionStart);
  marker.textContent = element.value.slice(element.selectionStart) || ".";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const height =
    markerRect.height ||
    parseFloat(computedStyle.lineHeight) ||
    parseFloat(computedStyle.fontSize);

  mirror.remove();

  return new DOMRect(
    elementRect.left + (markerRect.left - mirrorRect.left) - element.scrollLeft,
    elementRect.top + (markerRect.top - mirrorRect.top) - element.scrollTop,
    0,
    height,
  );
}

function getCaretRectFromContentEditable(element: HTMLElement): DOMRect | null {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!isNodeWithinElement(range.endContainer, element)) {
    return null;
  }

  const rangeRect = range.getBoundingClientRect();
  if (rangeRect.width || rangeRect.height) {
    return rangeRect;
  }

  const restoreRange = range.cloneRange();
  const markerRange = range.cloneRange();
  const marker = document.createElement("span");

  marker.textContent = "\u200b";
  markerRange.collapse(false);
  markerRange.insertNode(marker);

  const markerRect = marker.getBoundingClientRect();
  marker.remove();
  selection.removeAllRanges();
  selection.addRange(restoreRange);

  if (markerRect.width || markerRect.height) {
    return markerRect;
  }

  return null;
}

function getCaretRect(element: SupportedEditable): DOMRect | null {
  if (isTextInput(element)) {
    return getCaretRectFromTextInput(element);
  }

  return getCaretRectFromContentEditable(element);
}

function insertIntoTextInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) {
  if (element.selectionStart === null || element.selectionEnd === null) {
    return false;
  }

  const start = element.selectionStart;
  const end = element.selectionEnd;
  element.setRangeText(text, start, end, "end");
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: text,
      inputType: "insertText",
    }),
  );
  return true;
}

function insertIntoContentEditable(element: HTMLElement, text: string) {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  if (!isNodeWithinElement(range.endContainer, element)) {
    return false;
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: text,
      inputType: "insertText",
    }),
  );
  return true;
}

function insertSuggestionText(element: SupportedEditable, text: string) {
  if (isTextInput(element)) {
    return insertIntoTextInput(element, text);
  }

  return insertIntoContentEditable(element, text);
}

export default defineContentScript({
  matches: ["*://gemini.google.com/*"],
  async main() {
    window.__coreplyBrowserExtensionCleanup?.();

    const defaultGlobalSettings = createDefaultGlobalSettings();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      display: "none",
      whiteSpace: "pre",
      color: "rgba(17, 24, 39, 0.45)",
      background: "transparent",
      border: "0",
      borderRadius: "0",
      padding: "0",
      boxShadow: "none",
      backdropFilter: "none",
      opacity: "1",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(overlay);

    let activeEditable: SupportedEditable | null = null;
    let currentTyping = "";
    let currentSuggestion = "";
    let isComposing = false;
    let isEnabled = true;

    const coreply = new Coreply({
      onInit() {},
      onSuggestionUpdated(fullSuggestion) {
        if (!currentTyping || !fullSuggestion.startsWith(currentTyping)) {
          clearOverlay();
          return;
        }

        const suffix = fullSuggestion.slice(currentTyping.length);
        if (!suffix.trim()) {
          clearOverlay();
          return;
        }

        currentSuggestion = suffix;
        overlay.textContent = suffix;
        positionOverlay();
      },
      onSuggestionCleared() {
        clearOverlay();
      },
      onError() {
        clearOverlay();
      },
    });

    let watchedProviderConfigKey = "";
    let unwatchProviderConfig = () => {};

    function clearOverlay() {
      currentSuggestion = "";
      overlay.textContent = "";
      overlay.style.display = "none";
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
      coreply.reset();
    }

    async function syncSettings() {
      const storedMasterSwitch = await storage.getItem<string>(MASTER_SWITCH_KEY);
      isEnabled = storedMasterSwitch !== "false";

      const storedProviderId = await storage.getItem<string>(PROVIDER_ID_KEY);
      const nextProviderId = storedProviderId ?? coreply.getSettings().providerId;
      const providerDefinition =
        providerDefinitions[nextProviderId as keyof typeof providerDefinitions];

      if (!providerDefinition) {
        return;
      }

      watchProviderConfig(nextProviderId);

      const [storedProviderConfig, storedGlobalSettings] = await Promise.all([
        storage.getItem<string>(getProviderConfigKey(nextProviderId)),
        storage.getItem<string>(GLOBAL_SETTINGS_KEY),
      ]);

      const parsedGlobalSettings = globalSettingsSchema.safeParse(
        parseStoredJson(storedGlobalSettings),
      );

      coreply.updateSettings({
        providerId: nextProviderId,
        providerConfig:
          parseStoredRecord(storedProviderConfig) ??
          providerDefinition.settingsDefaults,
        globalSettings: parsedGlobalSettings.success
          ? parsedGlobalSettings.data
          : defaultGlobalSettings,
      });
    }

    async function syncSettingsAndRefreshSuggestion() {
      await syncSettings();

      if (!isEnabled) {
        clearState();
        return;
      }

      if (!currentTyping) {
        syncFromFocusedEditable();

        if (currentTyping) {
          return;
        }

        clearOverlay();
        return;
      }

      coreply.reset();
      coreply.updateTyping("");
      coreply.updateTyping(currentTyping);
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

    function positionOverlay() {
      if (!activeEditable || !currentSuggestion) {
        overlay.style.display = "none";
        return;
      }

      const caretRect = getCaretRect(activeEditable);
      if (!caretRect) {
        overlay.style.display = "none";
        return;
      }

      const computedStyle = window.getComputedStyle(activeEditable);
      overlay.style.font = computedStyle.font;
      overlay.style.fontFamily = computedStyle.fontFamily;
      overlay.style.fontSize = computedStyle.fontSize;
      overlay.style.fontWeight = computedStyle.fontWeight;
      overlay.style.letterSpacing = computedStyle.letterSpacing;
      overlay.style.lineHeight = computedStyle.lineHeight;
      overlay.style.textAlign = computedStyle.textAlign;

      overlay.style.display = "block";

      const overlayRect = overlay.getBoundingClientRect();
      const left = Math.min(
        Math.max(caretRect.right + 1, 8),
        window.innerWidth - overlayRect.width - 8,
      );
      const top = Math.min(
        Math.max(
          caretRect.top + (caretRect.height - overlayRect.height) / 2,
          8,
        ),
        window.innerHeight - overlayRect.height - 8,
      );

      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
    }

    function updateSuggestion(nextTyping: string) {
      clearOverlay();
      coreply.updateTyping(nextTyping);
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
        activeEditable = null;
        currentTyping = "";
        clearOverlay();
        return;
      }

      activeEditable = editable;

      const nextTyping = getTypingBeforeCursor(editable);
      if (!nextTyping || !nextTyping.trim()) {
        currentTyping = "";
        clearOverlay();
        return;
      }

      if (nextTyping !== currentTyping) {
        currentTyping = nextTyping;
        updateSuggestion(nextTyping);
        return;
      }

      positionOverlay();
    }

    const onInput = () => {
      syncFromFocusedEditable();
    };

    const onSelectionChange = () => {
      syncFromFocusedEditable();
    };

    const onFocusIn = () => {
      syncFromFocusedEditable();
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        syncFromFocusedEditable();
      }, 0);
    };

    const onScrollOrResize = () => {
      if (!isEnabled) {
        return;
      }

      positionOverlay();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !isEnabled ||
        event.key !== "Tab" ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if (!activeEditable || !currentSuggestion) {
        return;
      }

      const { insertedText, remainingSuggestion } =
        getSuggestionInsertion(currentSuggestion);

      if (!insertedText) {
        return;
      }

      event.preventDefault();

      if (!insertSuggestionText(activeEditable, insertedText)) {
        return;
      }

      currentSuggestion = remainingSuggestion;
      overlay.textContent = remainingSuggestion;
      syncFromFocusedEditable();
    };

    const onCompositionStart = () => {
      isComposing = true;
      clearOverlay();
    };

    const onCompositionEnd = () => {
      isComposing = false;
      syncFromFocusedEditable();
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("selectionchange", onSelectionChange, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("compositionstart", onCompositionStart, true);
    document.addEventListener("compositionend", onCompositionEnd, true);
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
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize, true);
      unwatchGlobalSettings();
      unwatchMasterSwitch();
      unwatchProviderId();
      unwatchProviderConfig();
      coreply.reset();
      overlay.remove();
      delete window.__coreplyBrowserExtensionCleanup;
    };

    syncFromFocusedEditable();
  },
});
