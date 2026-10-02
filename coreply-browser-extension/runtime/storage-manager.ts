import { storage } from "#imports";
import { CoreplyStorageManager, STORAGE_KEYS } from "../../coreply-app/src/lib/storage";

export function storageKey(key: string) {
  const namespace = key === STORAGE_KEYS.suggestionFetchLogs ? "coreply.troubleshooting" : "coreply.settings";
  return `local:${namespace}.${key}` as const;
}

export const storageManager = new CoreplyStorageManager({
  getItem: (key) => storage.getItem<string>(storageKey(key)),
  setItem: (key, value) => storage.setItem(storageKey(key), value),
  removeItem: (key) => storage.removeItem(storageKey(key)),
}, "web");
