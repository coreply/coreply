import {
  createAsyncStorage as createIndexedDbAsyncStorage,
  type AsyncStorage,
} from "@react-native-async-storage/async-storage";
import { storage as extensionStorage } from "@wxt-dev/storage";

function isExtensionEnvironment() {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.runtime !== "undefined" &&
    chrome.runtime.id !== undefined
  );
}

class WxtAsyncStorage implements AsyncStorage {
  constructor(private readonly namespace: string) {}

  private getKey(key: string) {
    return `local:${this.namespace}.${key}` as const;
  }

  async getItem(key: string) {
    return extensionStorage.getItem<string>(this.getKey(key));
  }

  async setItem(key: string, value: string) {
    await extensionStorage.setItem(this.getKey(key), value);
  }

  async removeItem(key: string) {
    await extensionStorage.removeItem(this.getKey(key));
  }

  async getMany(keys: string[]) {
    const values = await extensionStorage.getItems(
      keys.map((key) => this.getKey(key)),
    );

    return Object.fromEntries(
      values.map(({ key, value }) => [
        key.slice(`local:${this.namespace}.`.length),
        typeof value === "string" ? value : null,
      ]),
    );
  }

  async setMany(entries: Record<string, string>) {
    await extensionStorage.setItems(
      Object.entries(entries).map(([key, value]) => ({
        key: this.getKey(key),
        value,
      })),
    );
  }

  async removeMany(keys: string[]) {
    await extensionStorage.removeItems(keys.map((key) => this.getKey(key)));
  }

  async getAllKeys() {
    const snapshot = await extensionStorage.snapshot("local");
    const prefix = `${this.namespace}.`;

    return Object.keys(snapshot)
      .filter((key) => key.startsWith(prefix) && !key.endsWith("$"))
      .map((key) => key.slice(prefix.length));
  }

  async clear() {
    const keys = await this.getAllKeys();
    await this.removeMany(keys);
  }
}

export function createAsyncStorage(namespace: string): AsyncStorage {
  if (isExtensionEnvironment()) {
    return new WxtAsyncStorage(namespace);
  }

  return createIndexedDbAsyncStorage(namespace);
}
