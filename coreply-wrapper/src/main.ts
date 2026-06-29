import { Coreply } from "libcoreply";
import {
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
    onSuggestionCleared() {
      postToNative({
        type: "clearSuggestion",
      });
    },
    onError(error) {
      postToNative({
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
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
        case "ingestMessages":
          coreply.ingestMessages(parsedData.payload.messages);
          break;
        case "updateTyping":
          coreply.updateTyping(parsedData.payload.currentTyping);
          break;
        case "reset":
          coreply.reset();
          break;
      }
    }
  };
}
