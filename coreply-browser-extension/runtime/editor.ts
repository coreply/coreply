export type SupportedEditable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

declare global {
  interface Window {
    __coreplyBrowserExtensionCleanup?: () => void;
  }
}

export function isTextInput(
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

export function isSupportedEditable(element: Element): element is SupportedEditable {
  return (
    isTextInput(element) ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

export function findEditableFromElement(
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

export function getDeepActiveElement(
  root: Document | ShadowRoot = document,
): Element | null {
  let activeElement = root.activeElement;
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  return activeElement;
}

export function getTypingBeforeCursor(element: SupportedEditable): string | null {
  if (isTextInput(element)) {
    return getTypingFromTextInput(element);
  }

  return getTypingFromContentEditable(element);
}

export function isCaretAtEnd(element: SupportedEditable): boolean {
  if (isTextInput(element)) {
    return (
      element.selectionStart !== null &&
      element.selectionStart === element.selectionEnd &&
      element.selectionEnd === element.value.length
    );
  }

  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  if (!isNodeWithinElement(range.endContainer, element)) {
    return false;
  }

  const textAfterCaret = range.cloneRange();
  textAfterCaret.selectNodeContents(element);
  textAfterCaret.setStart(range.endContainer, range.endOffset);
  return textAfterCaret.toString().length === 0;
}

export function getCaretRect(element: SupportedEditable): DOMRect | null {
  if (isTextInput(element)) {
    return getCaretRectFromTextInput(element);
  }

  return getCaretRectFromContentEditable(element);
}

export function insertSuggestionText(element: SupportedEditable, text: string) {
  if (isTextInput(element)) {
    return insertIntoTextInput(element, text);
  }

  return insertIntoContentEditable(element, text);
}

export function getSuggestionInsertion(suggestion: string) {
  const match = suggestion.match(/^(\s*\S+)(.*)$/);
  if (!match) {
    return { insertedText: suggestion, remainingSuggestion: "" };
  }

  return {
    insertedText: match[1],
    remainingSuggestion: match[2],
  };
}

const SUPPORTED_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "url",
  "tel",
]);

function getParentElementAcrossShadow(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }

  const rootNode = element.getRootNode();
  return rootNode instanceof ShadowRoot ? rootNode.host : null;
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

function getCaretRectFromTextInput(
  element: HTMLInputElement | HTMLTextAreaElement,
): DOMRect | null {
  if (element.selectionStart === null) {
    return null;
  }

  const computedStyle = window.getComputedStyle(element);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");
  mirror.setAttribute("data-coreply-owned", "true");
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
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
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
    "fontVariationSettings",
    "fontFeatureSettings",
    "fontOpticalSizing",
    "fontKerning",
    "letterSpacing",
    "wordSpacing",
    "direction",
    "textAlign",
    "textTransform",
    "textIndent",
    "tabSize",
    "whiteSpace",
    "wordBreak",
  ] as const;

  for (const property of properties) {
    mirror.style[property] = computedStyle[property];
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
  // A collapsed range's rect is the caret itself only when it has zero
  // width. Chrome otherwise reports the box of the previous character or of
  // the whole line, whose left edge sits left of the caret.
  if (rangeRect.width === 0 && rangeRect.height > 0) {
    return rangeRect;
  }

  const previousCharacter = getPreviousCharacterRange(element, range);
  if (previousCharacter) {
    const previousRect = previousCharacter.getBoundingClientRect();
    if (previousRect.width > 0 || previousRect.height > 0) {
      return new DOMRect(
        previousRect.right,
        previousRect.top,
        0,
        previousRect.height,
      );
    }
  }

  const restoreRange = range.cloneRange();
  const markerRange = range.cloneRange();
  const marker = document.createElement("span");

  marker.setAttribute("data-coreply-owned", "true");
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

// Selects the character immediately before the caret, used to derive the
// caret's x position from the right edge of the preceding text.
function getPreviousCharacterRange(
  element: HTMLElement,
  caret: Range,
): Range | null {
  const container = caret.startContainer;
  if (container.nodeType === Node.TEXT_NODE && caret.startOffset > 0) {
    const range = document.createRange();
    range.setStart(container, caret.startOffset - 1);
    range.setEnd(container, caret.startOffset);
    return range;
  }

  // The caret sits at a node boundary (e.g. right after an inserted text
  // node); measure the last character before the boundary instead.
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let previous: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (caret.comparePoint(node, node.textContent?.length ?? 0) < 0) {
      previous = node as Text;
    }
  }
  if (!previous?.textContent) {
    return null;
  }

  const range = document.createRange();
  const length = previous.textContent.length;
  range.setStart(previous, length - 1);
  range.setEnd(previous, length);
  return range;
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

  return document.execCommand("insertText", false, text);
}
