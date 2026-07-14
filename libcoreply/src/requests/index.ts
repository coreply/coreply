import type { TypingInfo } from "../context";
import { providerDefinitions } from "../providers";

export async function requestSuggestions(
  typingInfo: TypingInfo,
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
    typingInfo,
  );
}
