import type { CoreplyContext } from "../context";
import type { ProviderDefinition } from "./index";
import type { ProviderInstance } from "./instance";

export class StatelessProviderInstance implements ProviderInstance {
  private readonly providerDefinition: ProviderDefinition;

  constructor(
    providerDefinition: ProviderDefinition,
  ) {
    this.providerDefinition = providerDefinition;
  }

  request(
    contexts: CoreplyContext[],
    currentTyping: string,
    providerConfig: Record<string, unknown>,
  ) {
    const request = this.providerDefinition.requestFunc as (
      definition: typeof this.providerDefinition,
      settings: Record<string, unknown>,
      contexts: CoreplyContext[],
      typing: string,
    ) => Promise<string>;
    // Registry pairs each provider definition with a request function using this internal contract.
    return request(
      this.providerDefinition,
      providerConfig,
      contexts,
      currentTyping,
    );
  }
}
