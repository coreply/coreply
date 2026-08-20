import type { CoreplyContext } from "../context";
import { providerDefinitions } from "../providers";

// ** Updated to use contexts and currentTyping instead of full TypingInfo
export async function requestSuggestions(
  contexts: CoreplyContext[],
  currentTyping: string,
  providerId: string,
  providerConfig: Record<string, unknown>,
): Promise<string> {
  const providerDefinition =
    providerDefinitions[providerId as keyof typeof providerDefinitions];
  if (!providerDefinition) {
    throw new Error(`Provider ${providerId} not found`);
  }

  return providerDefinition.requestFunc(
    providerDefinition as any,
    providerConfig,
    contexts,
    currentTyping,
  );
}
