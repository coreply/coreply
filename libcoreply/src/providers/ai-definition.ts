import type { LanguageModel } from "ai";
import type { z } from "zod";
import { generateStatelessSuggestion } from "./base";
import { mustacheProfileSettingsSchema } from "../profile/schema";
import type { ProviderInstanceOptions } from "./instance";
import type { createAISettingsSchema, createStatefulSettingsSchema } from "./settings";
import { StatefulAIProviderInstance } from "./stateful";
import { StatelessProviderInstance } from "./stateless";

interface AIProviderConfig<Settings, Defaults> {
  name: string;
  description: string;
  deprecatedDescription: string;
  settingsSchema: z.ZodType<Settings>;
  settingsDefaults: Defaults;
  createModel(settings: NoInfer<Settings>): LanguageModel;
}

export function defineStatelessAIProvider<
  Settings extends z.output<ReturnType<typeof createAISettingsSchema>>,
  Defaults extends Record<string, unknown>,
>(config: AIProviderConfig<Settings, Defaults>) {
  return {
    name: `${config.name} (Deprecated)`,
    description: config.deprecatedDescription,
    stateful: false,
    profileSettingsSchema: mustacheProfileSettingsSchema,
    settingsSchema: config.settingsSchema,
    settingsDefaults: config.settingsDefaults,
    createInstance() {
      return new StatelessProviderInstance((contexts, typing, providerConfig) => {
        const settings = config.settingsSchema.parse(providerConfig);
        return generateStatelessSuggestion(
          config.createModel(settings),
          settings,
          contexts,
          typing,
        );
      });
    },
  };
}

export function defineStatefulAIProvider<
  Settings extends z.output<ReturnType<typeof createStatefulSettingsSchema>>,
  Defaults extends Record<string, unknown>,
>(config: AIProviderConfig<Settings, Defaults>) {
  return {
    name: config.name,
    description: config.description,
    stateful: true,
    profileSettingsSchema: mustacheProfileSettingsSchema,
    settingsSchema: config.settingsSchema,
    settingsDefaults: config.settingsDefaults,
    createInstance(options?: ProviderInstanceOptions) {
      return new StatefulAIProviderInstance(
        config.settingsSchema,
        config.createModel,
        options?.onModelResponse,
      );
    },
  };
}
