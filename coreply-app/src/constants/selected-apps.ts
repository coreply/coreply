import { createAsyncStorage } from "./storage";

export const SELECTED_APPS_STORAGE_KEY = "selectedApps";

const storage = createAsyncStorage("coreply.settings");

export async function loadSelectedApps() {
  const value = await storage.getItem(SELECTED_APPS_STORAGE_KEY);

  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string")) {
      return [] as string[];
    }

    return parsed;
  } catch {
    return [] as string[];
  }
}

export async function saveSelectedApps(packageNames: string[]) {
  await storage.setItem(
    SELECTED_APPS_STORAGE_KEY,
    JSON.stringify(packageNames),
  );
}
