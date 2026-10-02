import { Platform } from "react-native";
import { storageManager } from "@/constants/storage-manager";
import * as Brownfield from "./brownfield-wrapper";

export async function syncStoredSettings() {
  if (Platform.OS === "android") {
    Brownfield.sendMessage({ type: "settingsUpdated", data: await storageManager.loadSettings() });
  }
}
