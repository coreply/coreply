import { storageManager } from "./storage-manager";

export const TROUBLESHOOTING_STORAGE_NAMESPACE = "coreply.troubleshooting";
export const SUGGESTION_FETCH_LOGS_STORAGE_KEY = "suggestionFetchLogs";

export async function loadSuggestionFetchLogs() {
  return storageManager.loadSuggestionFetchLogs();
}

export async function clearSuggestionFetchLogs() {
  await storageManager.clearSuggestionFetchLogs();
}
