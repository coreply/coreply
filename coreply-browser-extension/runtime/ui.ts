import { browser } from "#imports";
import { getCaretRect, type SupportedEditable } from "./editor";

type OverlayKind = "inline" | "trailing";

function createSuggestionElement(id: string, kind: OverlayKind) {
  const overlay = document.createElement("div");
  overlay.id = id;
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("data-coreply-owned", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    zIndex: "2147483647",
    pointerEvents: "none",
    display: "none",
    whiteSpace: "pre",
    overflow: "hidden",
    textOverflow: "ellipsis",
    border: "0",
    boxShadow: "none",
    backdropFilter: "none",
    opacity: "1",
  } satisfies Partial<CSSStyleDeclaration>);

  // The text span truncates with an ellipsis so the logo next to it never
  // gets clipped by the overlay's max width.
  const text = document.createElement("span");
  Object.assign(text.style, {
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: "0",
  } satisfies Partial<CSSStyleDeclaration>);
  const logo = createOverlayLogo();
  overlay.append(text, logo);
  return Object.assign(overlay, { text, logo, kind });
}

export function createSuggestionOverlay() {
  return Object.assign(document.createElement("div"), {
    inline: createSuggestionElement(
      "__coreply_browser_extension_suggestion_inline",
      "inline",
    ),
    trailing: createSuggestionElement(
      "__coreply_browser_extension_suggestion_trailing",
      "trailing",
    ),
  });
}

export function setSuggestionText(
  overlay: ReturnType<typeof createSuggestionOverlay>,
  text: { inline: string; trailing: string },
): void {
  overlay.inline.text.textContent = text.inline;
  overlay.trailing.text.textContent = text.trailing;
}

// The logo asset is cropped from the padded app icon foreground so it fits
// inside the logo box without scaling or clipping the mark.
function createOverlayLogo() {
  const logo = document.createElement("div");
  Object.assign(logo.style, {
    display: "none",
    width: "16px",
    height: "16px",
    overflow: "hidden",
    marginInlineStart: "2px",
    flex: "none",
    alignItems: "center",
    justifyContent: "center",
  } satisfies Partial<CSSStyleDeclaration>);

  const icon = document.createElement("img");
  icon.alt = "";
  icon.src = browser.runtime.getURL("/logo.png");
  Object.assign(icon.style, {
    width: "16px",
    height: "16px",
    display: "block",
    objectFit: "contain",
  } satisfies Partial<CSSStyleDeclaration>);
  logo.append(icon);
  return logo;
}

// Mirror of Android's hint-text bubble, using the app theme's background /
// foreground colors (coreply-app/global.css --color-background /
// --color-foreground per color scheme) instead of Android green. Like
// Android's InlineSuggestionOverlay, the logo is only shown when the bubble
// has a background.
function applySuggestionStyle(
  overlay: ReturnType<typeof createSuggestionElement>,
  showBackground: boolean,
  showLogo: boolean,
): void {
  overlay.logo.style.display = showLogo ? "flex" : "none";
  if (!showBackground) {
    Object.assign(overlay.style, {
      color: "rgba(17, 24, 39, 0.45)",
      background: "transparent",
      border: "0",
      borderRadius: "0",
      padding: "0",
    } satisfies Partial<CSSStyleDeclaration>);
    return;
  }

  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  Object.assign(overlay.style, {
    color: dark ? "oklch(0.977 0.001 17.176)" : "oklch(0.221 0.008 182.201)",
    background: dark
      ? "oklch(0.221 0.008 182.201 / 0.75)"
      : "oklch(0.977 0.001 17.176 / 0.75)",
    border: dark
      ? "1px solid oklch(0.977 0.001 17.176 / 0.15)"
      : "1px solid oklch(0.221 0.008 182.201 / 0.15)",
    borderRadius: "4px",
    padding: "1px 8px",
    // Flex row like Android's Row { Text; Logo }: the text span shrinks with
    // an ellipsis while the logo stays pinned at the end, fully visible.
    alignItems: "center",
  } satisfies Partial<CSSStyleDeclaration>);
}

function copyTextStyle(
  overlay: ReturnType<typeof createSuggestionOverlay>,
  editable: SupportedEditable,
) {
  const computedStyle = window.getComputedStyle(editable);
  for (const element of [overlay.inline, overlay.trailing]) {
    element.style.font = computedStyle.font;
    element.style.fontFamily = computedStyle.fontFamily;
    element.style.fontSize = computedStyle.fontSize;
    element.style.fontWeight = computedStyle.fontWeight;
    element.style.fontVariationSettings = computedStyle.fontVariationSettings;
    element.style.fontFeatureSettings = computedStyle.fontFeatureSettings;
    element.style.fontOpticalSizing = computedStyle.fontOpticalSizing;
    element.style.fontKerning = computedStyle.fontKerning;
    element.style.letterSpacing = computedStyle.letterSpacing;
    element.style.lineHeight = computedStyle.lineHeight;
    element.style.textAlign = computedStyle.textAlign;
  }
}

export function clearSuggestionOverlay(
  overlay: ReturnType<typeof createSuggestionOverlay>,
): void {
  overlay.inline.style.display = "none";
  overlay.trailing.style.display = "none";
}

export function positionSuggestionOverlay(
  overlay: ReturnType<typeof createSuggestionOverlay>,
  editable: SupportedEditable | null,
  suggestion: string,
  showBackground: boolean,
  suggestionPresentationType: "inline" | "overlay" | "both",
): void {
  if (!editable || !suggestion) {
    clearSuggestionOverlay(overlay);
    return;
  }

  copyTextStyle(overlay, editable);

  const fieldRect = editable.getBoundingClientRect();
  const inline = overlay.inline;
  const trailing = overlay.trailing;

  const showInline =
    suggestionPresentationType === "inline" ||
    suggestionPresentationType === "both";
  const showTrailingBase = suggestionPresentationType === "overlay";
  const inlineShowsBubble = showBackground && showInline;
  const trailingShowsLogo = !inlineShowsBubble;

  applySuggestionStyle(inline, showBackground, inlineShowsBubble);
  applySuggestionStyle(trailing, true, trailingShowsLogo);
  inline.style.display = "none";
  trailing.style.display = "none";
  const caretRect = getCaretRect(editable);

  if (showBackground) {
    if (showInline) {
      const regionLeft = fieldRect.left + fieldRect.width * 0.25;
      const regionRight = fieldRect.right;
      inline.style.maxWidth = `${Math.max(regionRight - regionLeft, 0)}px`;
      inline.style.display = "flex";

      const bubbleRect = inline.getBoundingClientRect();
      inline.style.left = `${Math.max(regionRight - bubbleRect.width, regionLeft)}px`;
      inline.style.top = `${fieldRect.top + (fieldRect.height - bubbleRect.height) / 2}px`;
    }

    if (showTrailingBase && caretRect) {
      trailing.style.display = "flex";
      trailing.style.maxWidth = `${Math.max(fieldRect.width, 0)}px`;
      trailing.style.left = `${caretRect.right + 1}px`;
      trailing.style.top = `${caretRect.bottom + 4}px`;
    }
    return;
  }

  if (!caretRect) {
    clearSuggestionOverlay(overlay);
    return;
  }

  const inlineAvailableWidth = Math.max(fieldRect.right - caretRect.right - 1, 0);
  let needsTrailingInBoth = false;

  if (showInline) {
    inline.style.maxWidth = "none";
    inline.style.display = "block";

    needsTrailingInBoth =
      suggestionPresentationType === "both" &&
      inline.getBoundingClientRect().width > inlineAvailableWidth;

    inline.style.maxWidth = `${inlineAvailableWidth}px`;

    const inlineRect = inline.getBoundingClientRect();
    inline.style.left = `${Math.max(caretRect.right + 1, fieldRect.left)}px`;
    inline.style.top = `${Math.min(
      Math.max(
        caretRect.top + (caretRect.height - inlineRect.height) / 2,
        fieldRect.top,
      ),
      Math.max(fieldRect.bottom - inlineRect.height, fieldRect.top),
    )}px`;
  }

  if (showTrailingBase || needsTrailingInBoth) {
    trailing.style.display = "flex";
  }

  if (trailing.style.display !== "none") {
    trailing.style.maxWidth = `${Math.max(fieldRect.width, 0)}px`;
    trailing.style.left = `${caretRect.right + 1}px`;
    trailing.style.top = `${caretRect.bottom + 4}px`;
  }
}
