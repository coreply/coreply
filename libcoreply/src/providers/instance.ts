import type { CoreplyContext } from "../context";
import { providerDefinitions } from "./index";

export interface ProviderInstance {
  request(
    contexts: CoreplyContext[],
    currentTyping: string,
    providerConfig: Record<string, unknown>,
  ): Promise<string>;
}

export function createProviderInstance(providerId: string): ProviderInstance {
  const providerDefinition = providerDefinitions[
    providerId as keyof typeof providerDefinitions
  ];

  if (!providerDefinition) {
    throw new Error(`Provider ${providerId} not found`);
  }

  return providerDefinition.createInstance();
}
