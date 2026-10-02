import { matchesProfile, type Coreply } from "../../libcoreply/src";
import { providerConfigKey, STORAGE_KEYS } from "../../coreply-app/src/lib/storage";
import { storageKey, storageManager } from "./storage-manager";

export const GLOBAL_SETTINGS_KEY = storageKey(STORAGE_KEYS.globalSettings);
export const MASTER_SWITCH_KEY = storageKey(STORAGE_KEYS.masterSwitch);
export const PROVIDER_ID_KEY = storageKey(STORAGE_KEYS.providerId);
export const SELECTED_APPS_KEY = storageKey(STORAGE_KEYS.selectedApps);
export const PROFILES_KEY = storageKey(STORAGE_KEYS.profiles);
export const getProviderConfigKey = (id: string) => storageKey(providerConfigKey(id));

export async function syncCoreplySettings(coreply: Coreply): Promise<boolean> {
  const [settings, enabled] = await Promise.all([
    storageManager.loadSettings(),
    storageManager.loadMasterSwitch(),
  ]);
  coreply.updateSettings(settings);
  return enabled && settings.profiles.some((profile) =>
    settings.selectedApps.includes(profile.id) && matchesProfile(profile, "web", location.href),
  );
}
