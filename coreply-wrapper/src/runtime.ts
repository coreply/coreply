import { Coreply } from "libcoreply";
import type { WrapperInboundMessage, WrapperOutboundMessage } from "./schemas";

// No WebView, DOM, or extension globals belong in this runtime. Each platform
// owns its transport and creates exactly one runtime for its active source.
export function createCoreplyRuntime(
  libToNative: (message: WrapperOutboundMessage) => void,
  cloudUrl: string,
) {
  const coreply = new Coreply({
    onInit() { libToNative({ type: "init" }); },
    onSuggestionUpdated(fullSuggestion) {
      libToNative({ type: "updateSuggestion", payload: { fullSuggestion } });
    },
    onSuggestionCleared() { libToNative({ type: "clearSuggestion" }); },
    onError(error) {
      libToNative({ type: "error", payload: { message: error instanceof Error ? error.message : String(error) } });
    },
    onCollectionModeUpdated(collectionMode) {
      libToNative({ type: "collectionModeUpdated", payload: { collectionMode } });
    },
    onLog(log) { libToNative({ type: "log", payload: log }); },
  }, { cloudUrl });

  return {
    nativeToLib(message: WrapperInboundMessage) {
      switch (message.type) {
        case "settings": coreply.updateSettings(message.payload); break;
        case "updateTyping": coreply.updateTyping(message.payload.currentTyping); break;
        case "snapshotUpdated": coreply.snapshotUpdated(message.payload.snapshot); break;
      }
    },
    getSettings: () => coreply.getSettings(),
  };
}
