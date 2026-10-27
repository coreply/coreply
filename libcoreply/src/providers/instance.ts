import type { CoreplyContext } from "../context";
import type { generateText } from "ai";

export interface ProviderInstanceOptions {
  cloudUrl?: string;
  onModelResponse?: (response: Awaited<ReturnType<typeof generateText>>) => void | Promise<void>;
}

export interface ProviderInstance {
  onModelResponse?: ProviderInstanceOptions["onModelResponse"];
  dispose?(): void;
  request(
    contexts: CoreplyContext[],
    currentTyping: string,
    providerConfig: Record<string, unknown>,
  ): Promise<string>;
}
