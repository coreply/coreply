import { storage } from "#imports";
import type { SuggestionFetchLog } from "../../libcoreply/src";

// Same storage the Troubleshooting Logs screen reads
// (coreply-app/src/constants/troubleshooting-logs.ts) and the same cap as
// Android's ExpoTroubleshootingStorage.
const SUGGESTION_FETCH_LOGS_KEY =
  "local:coreply.troubleshooting.suggestionFetchLogs";
const MAX_LOG_COUNT = 10;

function parseStoredLogs(value: string | null): SuggestionFetchLog[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as SuggestionFetchLog[];
    }
  } catch {
    // A corrupt store is reset, matching Android.
  }
  return [];
}

export async function appendSuggestionFetchLog(
  log: SuggestionFetchLog,
): Promise<void> {
  const existing = parseStoredLogs(
    await storage.getItem<string>(SUGGESTION_FETCH_LOGS_KEY),
  );
  const logs = [...existing, log].slice(-MAX_LOG_COUNT);
  await storage.setItem(SUGGESTION_FETCH_LOGS_KEY, JSON.stringify(logs));
}
