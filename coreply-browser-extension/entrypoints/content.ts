import { startBrowserListener } from "../runtime/browser-listener";

export default defineContentScript({
  // Enabled user profiles, not a fixed site list, gate snapshot collection.
  matches: ["http://*/*", "https://*/*"],
  main: startBrowserListener,
});
