import type { WebSnapshotNode } from "../../libcoreply/src/context/snapshot";
import { getDeepActiveElement, isSupportedEditable } from "./editor";

export function serializeWebSnapshot(
  element: Element,
  activeElement = getDeepActiveElement(),
): WebSnapshotNode {
  const isVisible = element.getClientRects().length > 0;

  return {
    id: element.id,
    tagName: element.tagName,
    text:
      isVisible && element instanceof HTMLElement
        ? element.innerText.trim() || null
        : null,
    ariaLabel: element.getAttribute("aria-label"),
    placeholder: element.getAttribute("placeholder"),
    name: element.getAttribute("name"),
    className: typeof element.className === "string" ? element.className : "",
    attributes: Object.fromEntries(
      [...element.attributes]
        .filter((attribute) => attribute.name.startsWith("data-"))
        .map((attribute) => [attribute.name, attribute.value]),
    ),
    isEditable: isSupportedEditable(element),
    isContentEditable:
      element instanceof HTMLElement && element.isContentEditable,
    isFocused: element === activeElement,
    isVisible,
    children: [...element.children].map((child) =>
      serializeWebSnapshot(child, activeElement),
    ),
  };
}

export function observeWebSnapshot(
  root: Element,
  onChange: () => void,
  getActiveComposer: () => HTMLElement | null,
): () => void {
  let timer = 0;
  const isOwned = (node: Node) => {
    const element = node instanceof Element ? node : node.parentElement;
    return Boolean(
      element?.closest("[data-coreply-owned='true']"),
    );
  };
  const observer = new MutationObserver((records) => {
    const activeComposer = getActiveComposer();
    const hasPageMutation = records.some((record) => {
      if (isOwned(record.target)) return false;
      if (activeComposer?.contains(record.target)) return false;
      const changedNodes = [...record.addedNodes, ...record.removedNodes];
      return changedNodes.length === 0 || changedNodes.some((node) => !isOwned(node));
    });
    if (!hasPageMutation) return;

    window.clearTimeout(timer);
    timer = window.setTimeout(onChange, 150);
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });

  return () => {
    observer.disconnect();
    window.clearTimeout(timer);
  };
}
