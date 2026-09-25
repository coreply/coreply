import { createAsyncStorage } from "./storage";
import {
  suggestionFetchLogSchema,
  type SuggestionFetchLog,
} from "libcoreply";
import { z } from "zod";

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
    return z.array(suggestionFetchLogSchema).parse(parsed);
  } catch {
    return [] as SuggestionFetchLog[];
  }
}

export async function clearSuggestionFetchLogs() {
  await storage.removeItem(SUGGESTION_FETCH_LOGS_STORAGE_KEY);
}
