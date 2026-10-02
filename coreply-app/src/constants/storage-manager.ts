import { Platform } from "react-native";
import { CoreplyStorageManager, STORAGE_KEYS } from "@/lib/storage";
import { createAsyncStorage } from "./storage";

const settingsStorage = createAsyncStorage("coreply.settings");
const logsStorage = createAsyncStorage("coreply.troubleshooting");
const storeFor = (key: string) => key === STORAGE_KEYS.suggestionFetchLogs ? logsStorage : settingsStorage;

export const storageManager = new CoreplyStorageManager({
  getItem: (key) => storeFor(key).getItem(key),
  setItem: (key, value) => storeFor(key).setItem(key, value),
  removeItem: (key) => storeFor(key).removeItem(key),
}, Platform.OS === "android" ? "android" : "web");
