import { createCoreplyRuntime } from "./runtime";
import { type WrapperOutboundMessage, wrapperInboundMessageSchema } from "./schemas";

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
  const runtime = createCoreplyRuntime(postToNative, import.meta.env.VITE_COREPLY_CLOUD_URL);
  coreplyBridgeObject.onmessage = (event) => {
    const data = event.data;
    if (typeof data === "string") {
      const parsedData = wrapperInboundMessageSchema.parse(JSON.parse(data));
      runtime.nativeToLib(parsedData);
    }
  };
}
