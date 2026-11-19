import { z } from "zod";
import type { ProviderInstance, ProviderInstanceOptions } from "./instance";

export interface ProviderDefinition {
  name: string;
  description: string;
  stateful: boolean;
  profileSettingsSchema: {
    profile: z.ZodObject;
    extractor: z.ZodObject;
  };
  settingsSchema: z.ZodType;
  settingsDefaults: Record<string, unknown>;
  createInstance(options?: ProviderInstanceOptions): ProviderInstance;
}

export const structuredContextProfileSettingsSchema = {
  profile: z.object({}),
  extractor: z.object({}),
};
