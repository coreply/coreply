const CONTENT_SCRIPT_ID = "wxt:content-scripts/content.js";
const CONTENT_SCRIPT_MATCHES = ["*://*.google.com/*"];

async function ensureContentScriptRegistered() {
  if (browser.runtime.getManifest().content_scripts?.length) {
    return;
  }

  const contentScript = {
    id: CONTENT_SCRIPT_ID,
    matches: CONTENT_SCRIPT_MATCHES,
    js: ["content-scripts/content.js"],
    runAt: "document_idle" as const,
    allFrames: false,
    persistAcrossSessions: true,
    world: "ISOLATED" as const,
  };

  const registered = await browser.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID],
  });

  if (registered.length > 0) {
    await browser.scripting.updateContentScripts([contentScript]);
    return;
  }

  await browser.scripting.registerContentScripts([contentScript]);

  const tabs = await browser.tabs.query({ url: CONTENT_SCRIPT_MATCHES });
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) {
        return;
      }

      try {
        await browser.tabs.reload(tab.id);
      } catch (error) {
        console.warn("Failed to reload tab after content script registration", error);
      }
    }),
  );
}

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  void ensureContentScriptRegistered();
});
