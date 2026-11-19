// Firefox exposes browser; the APIs used here also have Chrome types.
declare const browser: typeof chrome | undefined;

function getExtensionApi() {
  if (typeof browser !== "undefined" && browser.runtime?.id !== undefined) {
    return browser;
  }
  if (typeof chrome !== "undefined" && chrome.runtime?.id !== undefined) {
    return chrome;
  }
  return undefined;
}

export function isBrowserExtension() {
  return getExtensionApi() !== undefined;
}

export function openOnboardingTab() {
  const api = getExtensionApi();
  if (!api) throw new Error("Onboarding tabs require a browser extension runtime.");
  const url = new URL(api.runtime.getURL("/popup.html"));
  url.searchParams.set("onboarding", "true");
  window.open(url.href, "_blank", "noopener,noreferrer");
  window.close();
}

export async function openWebsiteSelectionPopup() {
  const api = getExtensionApi();
  if (!api) throw new Error("Website selection popups require a browser extension runtime.");
  await api.action.setPopup({ popup: "popup.html?select=select-apps" });
  try {
    await api.action.openPopup();
  } finally {
    await api.action.setPopup({ popup: "popup.html" });
  }
  window.location.assign(new URL("/usage", process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL!).href);
}
