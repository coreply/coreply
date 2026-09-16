import { Coreply } from "libcoreply";
import {
  suggestionFetchLogSchema,
  type WrapperOutboundMessage,
  wrapperInboundMessageSchema,
} from "./schemas";

declare global {
  var coreplyBridgeObject:
    | {
        postMessage(message: string): void;
        onmessage: (event: { data: string | ArrayBuffer }) => void;
      }
    | undefined;
}

function postToNative(message: WrapperOutboundMessage) {
  if (!coreplyBridgeObject) {
    return;
  }
  coreplyBridgeObject.postMessage(JSON.stringify(message));
}

if (coreplyBridgeObject) {
  const coreply = new Coreply({
    onInit() {
      postToNative({
        type: "init",
      });
    },
    onSuggestionUpdated(fullSuggestion) {
      postToNative({
        type: "updateSuggestion",
        payload: {
          fullSuggestion,
        },
      });
    },
    onSuggestionCleared() {},
    onError(error) {
      postToNative({
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    },
    onCollectionModeUpdated(collectionMode) {
      postToNative({
        type: "collectionModeUpdated",
        payload: {
          collectionMode,
        },
      });
    },
    onLog(log) {
      try {
        postToNative({
          type: "log",
          payload: suggestionFetchLogSchema.parse(log),
        });
      } catch (error) {
        console.error("Failed to validate suggestion fetch log:", error);
      }
    },
  });
  coreplyBridgeObject.onmessage = (event) => {
    const data = event.data;
    if (typeof data === "string") {
      const parsedData = wrapperInboundMessageSchema.parse(JSON.parse(data));
      switch (parsedData.type) {
        case "settings":
          coreply.updateSettings(parsedData.payload);
          break;
        case "updateTyping":
          coreply.updateTyping(parsedData.payload.currentTyping);
          break;
        // ** Added snapshotUpdated event handler to pass snapshots to libcoreply
        case "snapshotUpdated":
          coreply.snapshotUpdated(parsedData.payload.snapshot);
          break;
      }
    }
  };
}
