import { z } from "zod";
import {
  builtInProfiles, generateGenericProfile, profileSchema, type Profile,
  globalSettingsSchema, createDefaultGlobalSettings, type GlobalSettings,
  providerDefinitions, suggestionFetchLogSchema, type SuggestionFetchLog,
} from "libcoreply";

export const STORAGE_KEYS = {
  providerId: "providerId",
  globalSettings: "globalSettings",
  masterSwitch: "masterSwitch",
  selectedApps: "selectedApps",
  profiles: "profiles",
  suggestionFetchLogs: "suggestionFetchLogs",
} as const;

export function providerConfigKey(providerId: string) {
  return `${providerId}.providerConfig`;
}

// A persistence port, implemented by each platform's storage adapter.
interface StoragePort {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class CoreplyStorageManager {
  private writes: Promise<void> = Promise.resolve();
  private readonly persistence: StoragePort;
  private readonly platform: Profile["platform"];

  constructor(persistence: StoragePort, platform: Profile["platform"]) {
    this.persistence = persistence;
    this.platform = platform;
  }

  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writes.then(operation);
    this.writes = result.then(() => {}, () => {});
    return result;
  }

  private async readJson(key: string) {
    const value = await this.persistence.getItem(key);
    return value === null ? undefined : JSON.parse(value) as unknown;
  }

  async loadProviderId() {
    const providerId = await this.persistence.getItem(STORAGE_KEYS.providerId) ?? "coreplyCloud";
    if (!Object.prototype.hasOwnProperty.call(providerDefinitions, providerId)) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    return providerId as keyof typeof providerDefinitions;
  }

  async loadSettings() {
    const providerId = await this.loadProviderId();
    const [globalSettings, selectedApps, profiles, configs] = await Promise.all([
      this.readJson(STORAGE_KEYS.globalSettings),
      this.loadSelectedApps(),
      this.loadProfiles(),
      Promise.all(Object.keys(providerDefinitions).map(async (id) => [id, await this.loadProviderConfig(id)] as const)),
    ]);
    return {
      providerId,
      providerConfigs: Object.fromEntries(configs),
      globalSettings: globalSettings === undefined ? createDefaultGlobalSettings() : globalSettingsSchema.parse(globalSettings),
      selectedApps,
      profiles,
    };
  }

  async loadSelectedApps() {
    const value = await this.readJson(STORAGE_KEYS.selectedApps);
    return value === undefined ? [] : z.array(z.string()).parse(value);
  }

  saveSelectedApps(ids: string[]) {
    return this.mutate(() => this.persistence.setItem(STORAGE_KEYS.selectedApps, JSON.stringify(z.array(z.string()).parse(ids))));
  }

  saveProviderId(id: string) {
    return this.mutate(() => this.persistence.setItem(STORAGE_KEYS.providerId, id));
  }

  async loadProviderConfig(id: string) {
    const provider = providerDefinitions[id as keyof typeof providerDefinitions];
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    const value = await this.readJson(providerConfigKey(id));
    return value === undefined ? z.record(z.string(), z.unknown()).parse(JSON.parse(JSON.stringify(provider.settingsDefaults))) : z.record(z.string(), z.unknown()).parse(value);
  }

  ensureProviderConfig(id: string) {
    return this.mutate(async () => {
      const provider = providerDefinitions[id as keyof typeof providerDefinitions];
      if (!provider) throw new Error(`Unknown provider: ${id}`);
      const key = providerConfigKey(id);
      if (await this.persistence.getItem(key) === null) {
        await this.persistence.setItem(key, JSON.stringify(provider.settingsDefaults));
      }
    });
  }

  saveProviderConfig(id: string, config: Record<string, unknown>) {
    const provider = providerDefinitions[id as keyof typeof providerDefinitions];
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    const parsed = provider.settingsSchema.parse(config);
    return this.mutate(() => this.persistence.setItem(providerConfigKey(id), JSON.stringify(parsed)));
  }

  saveGlobalSettings(settings: GlobalSettings) {
    return this.mutate(() => this.persistence.setItem(STORAGE_KEYS.globalSettings, JSON.stringify(globalSettingsSchema.parse(settings))));
  }

  async loadMasterSwitch() {
    return await this.persistence.getItem(STORAGE_KEYS.masterSwitch) !== "false";
  }

  saveMasterSwitch(enabled: boolean) {
    return this.mutate(() => this.persistence.setItem(STORAGE_KEYS.masterSwitch, String(enabled)));
  }

  private async readProfiles() {
    const value = await this.readJson(STORAGE_KEYS.profiles);
    return value === undefined ? undefined : z.array(profileSchema).parse(value);
  }

  loadProfiles(): Promise<Profile[]> {
    return this.mutate(async () => {
      const stored = await this.readProfiles();
      if (stored !== undefined) return stored;
      const profiles = this.platform === "web"
        ? builtInProfiles.filter((profile) => profile.platform === "web").map((profile) => profileSchema.parse(profile))
        : [];
      await this.writeProfiles(profiles);
      return profiles;
    });
  }

  private writeProfiles(profiles: Profile[]) {
    return this.persistence.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
  }

  saveProfile(profile: Profile) {
    const parsed = profileSchema.parse(profile);
    if (parsed.platform !== this.platform) throw new Error("Profile platform does not match storage platform");
    return this.mutate(async () => {
      const profiles = await this.readProfiles() ?? [];
      await this.writeProfiles([...profiles.filter((entry) => entry.id !== parsed.id), parsed]);
    });
  }

  deleteProfile(id: string) {
    if (this.platform !== "web") throw new Error("Android profiles can only be reset");
    return this.mutate(async () => {
      await this.writeProfiles((await this.readProfiles() ?? []).filter((profile) => profile.id !== id));
      await this.persistence.setItem(STORAGE_KEYS.selectedApps, JSON.stringify((await this.loadSelectedApps()).filter((entry) => entry !== id)));
    });
  }

  async prepareAndroidProfiles(apps: { packageName: string; appName: string }[]) {
    if (this.platform !== "android") throw new Error("Installed app discovery is Android-only");
    return this.mutate(async () => {
      const profiles = await this.readProfiles() ?? [];
      const effectiveProfiles = apps.map((app) => {
        const existing = profiles.find((profile) => profile.id === app.packageName);
        const preset = builtInProfiles.find((profile) => profile.platform === "android" && profile.id === app.packageName);
        return existing
          ? { ...existing, displayName: app.appName }
          : preset ? { ...profileSchema.parse(preset), displayName: app.appName }
          : generateGenericProfile(app.packageName, app.appName);
      });
      // Generic defaults stay ephemeral until customized.
      await this.writeProfiles(effectiveProfiles.filter((profile) =>
        profiles.some((entry) => entry.id === profile.id) ||
        builtInProfiles.some((entry) => entry.platform === "android" && entry.id === profile.id),
      ));
      const installed = new Set(apps.map((app) => app.packageName));
      await this.persistence.setItem(STORAGE_KEYS.selectedApps, JSON.stringify((await this.loadSelectedApps()).filter((id) => installed.has(id))));
      return effectiveProfiles;
    });
  }

  resetAndroidProfile(packageName: string, appName: string) {
    if (this.platform !== "android") throw new Error("Reset is Android-only");
    return this.mutate(async () => {
      const profiles = (await this.readProfiles() ?? []).filter((profile) => profile.id !== packageName);
      const preset = builtInProfiles.find((profile) => profile.platform === "android" && profile.id === packageName);
      const profile = preset ? { ...profileSchema.parse(preset), displayName: appName } : generateGenericProfile(packageName, appName);
      await this.writeProfiles(preset ? [...profiles, profile] : profiles);
      return profile;
    });
  }

  async loadSuggestionFetchLogs() {
    const value = await this.readJson(STORAGE_KEYS.suggestionFetchLogs);
    return value === undefined ? [] : z.array(suggestionFetchLogSchema).parse(value);
  }

  appendSuggestionFetchLog(log: SuggestionFetchLog) {
    const parsed = suggestionFetchLogSchema.parse(log);
    return this.mutate(async () => {
      const logs = [...await this.loadSuggestionFetchLogs(), parsed].slice(-10);
      await this.persistence.setItem(STORAGE_KEYS.suggestionFetchLogs, JSON.stringify(logs));
    });
  }

  clearSuggestionFetchLogs() {
    return this.mutate(() => this.persistence.removeItem(STORAGE_KEYS.suggestionFetchLogs));
  }
}
