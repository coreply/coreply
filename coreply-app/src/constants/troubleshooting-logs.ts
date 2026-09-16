import { createAsyncStorage } from "./storage";
import type { SuggestionFetchLog } from "../../../coreply-wrapper/src/schemas";

export const TROUBLESHOOTING_STORAGE_NAMESPACE = "coreply.troubleshooting";
export const SUGGESTION_FETCH_LOGS_STORAGE_KEY = "suggestionFetchLogs";

const storage = createAsyncStorage(TROUBLESHOOTING_STORAGE_NAMESPACE);

export async function loadSuggestionFetchLogs() {
  const value = await storage.getItem(SUGGESTION_FETCH_LOGS_STORAGE_KEY);

  if (!value) {
    return [] as SuggestionFetchLog[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as SuggestionFetchLog[]) : [];
  } catch {
    return [] as SuggestionFetchLog[];
  }
}
