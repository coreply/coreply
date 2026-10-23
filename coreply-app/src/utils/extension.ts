export function isBrowserExtension() {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.runtime !== "undefined" &&
    chrome.runtime.id !== undefined
  );
}
