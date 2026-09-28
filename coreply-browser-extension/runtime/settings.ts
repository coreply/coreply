import { storage } from "#imports";
import {
  createDefaultGlobalSettings,
  globalSettingsSchema,
  providerDefinitions,
  type Coreply,
} from "../../libcoreply/src";

const SETTINGS_NAMESPACE = "coreply.settings";
export const GLOBAL_SETTINGS_KEY = `local:${SETTINGS_NAMESPACE}.globalSettings`;
export const MASTER_SWITCH_KEY = `local:${SETTINGS_NAMESPACE}.masterSwitch`;
export const PROVIDER_ID_KEY = `local:${SETTINGS_NAMESPACE}.providerId`;
export const SELECTED_APPS_KEY = `local:${SETTINGS_NAMESPACE}.selectedApps`;

export function getProviderConfigKey(providerId: string) {
  return `local:${SETTINGS_NAMESPACE}.${providerId}.providerConfig` as const;
}

export function parseStoredJson(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function parseStoredRecord(value: string | null) {
  const parsed = parseStoredJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  return parsed as Record<string, unknown>;
}

function parseStoredSelectedApps(value: string | null): string[] {
  const parsed = parseStoredJson(value);
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string")) {
    return [];
  }
  return parsed;
}

export async function syncCoreplySettings(coreply: Coreply): Promise<boolean> {
  const storedMasterSwitch = await storage.getItem<string>(MASTER_SWITCH_KEY);
  const isEnabled = storedMasterSwitch !== "false";

  const [storedProviderId, storedSelectedApps] = await Promise.all([
    storage.getItem<string>(PROVIDER_ID_KEY),
    storage.getItem<string>(SELECTED_APPS_KEY),
  ]);
  const selectedApps = parseStoredSelectedApps(storedSelectedApps);

  const nextProviderId = storedProviderId ?? coreply.getSettings().providerId;
  const providerDefinition =
    providerDefinitions[nextProviderId as keyof typeof providerDefinitions];

  if (providerDefinition) {
    const [storedProviderConfig, storedGlobalSettings] = await Promise.all([
      storage.getItem<string>(getProviderConfigKey(nextProviderId)),
      storage.getItem<string>(GLOBAL_SETTINGS_KEY),
    ]);
    const parsedGlobalSettings = globalSettingsSchema.safeParse(
      parseStoredJson(storedGlobalSettings),
    );

    coreply.updateSettings({
      providerId: nextProviderId,
      providerConfig:
        parseStoredRecord(storedProviderConfig) ??
        providerDefinition.settingsDefaults,
      globalSettings: parsedGlobalSettings.success
        ? parsedGlobalSettings.data
        : createDefaultGlobalSettings(),
      selectedApps,
    });
  }

  // Mirrors Android's isSupportedApp check: the site must be selected for
  // Coreply to run on it.
  return isEnabled && selectedApps.includes(location.hostname);
}
