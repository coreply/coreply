import type { CoreplyContext } from "../context";
import { createProviderInstance } from "../providers";

// ** Updated to use contexts and currentTyping instead of full TypingInfo
export async function requestSuggestions(
  contexts: CoreplyContext[],
  currentTyping: string,
  providerId: string,
  providerConfig: Record<string, unknown>,
): Promise<string> {
  const instance = createProviderInstance(providerId);
  return instance.request(contexts, currentTyping, providerConfig);
}
