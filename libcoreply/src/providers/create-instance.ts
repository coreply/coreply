import { providerDefinitions } from "./index";
import type { ProviderInstance, ProviderInstanceOptions } from "./instance";

export function createProviderInstance(
  providerId: string,
  options?: ProviderInstanceOptions,
): ProviderInstance {
  const definition = providerDefinitions[providerId as keyof typeof providerDefinitions];
  if (!definition) {
    throw new Error(`Provider ${providerId} not found`);
  }

  const instance: ProviderInstance = definition.createInstance(options);
  instance.onModelResponse = options?.onModelResponse;
  return instance;
}
