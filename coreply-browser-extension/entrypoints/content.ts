import { startBrowserListener } from "../runtime/browser-listener";

export default defineContentScript({
  matches: [
    "*://gemini.google.com/*",
    "*://chatgpt.com/*",
    "*://*.perplexity.ai/*",
    "*://chat.mistral.ai/*",
    "http://127.0.0.1/*",
    "https://127.0.0.1/*",
  ],
  main: startBrowserListener,
});
