import type { z } from "zod";
import type { ProviderInstance, ProviderInstanceOptions } from "./instance";

export interface ProviderDefinition {
  name: string;
  stateful: boolean;
  settingsSchema: z.ZodType;
  settingsDefaults: Record<string, unknown>;
  createInstance(options?: ProviderInstanceOptions): ProviderInstance;
}
