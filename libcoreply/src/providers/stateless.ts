import type { CoreplyContext } from "../context";
import type { ProviderInstance } from "./instance";

export class StatelessProviderInstance implements ProviderInstance {
  private readonly generate: ProviderInstance["request"];

  constructor(
    generate: ProviderInstance["request"],
  ) {
    this.generate = generate;
  }

  request(
    contexts: CoreplyContext[],
    currentTyping: string,
    providerConfig: Record<string, unknown>,
  ) {
    return this.generate(
      contexts,
      currentTyping,
      providerConfig,
    );
  }
}
