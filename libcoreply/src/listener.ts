export type SuggestionFetchLog = {
  type: "suggestionFetch";
  providerId: string;
  currentTyping: string;
  timestamp: string;
  durationMs: number;
  isGood: boolean;
  result:
    | {
        type: "success";
        suggestion: string;
      }
    | {
        type: "error";
        message: string;
      };
};

export interface LibCoreplyListener {
  onCollectionModeUpdated: (
    collectionMode: "minimal" | "frequent" | "active",
  ) => void;
  onInit: () => void;
  onSuggestionUpdated: (fullSuggestion: string) => void;
  onSuggestionCleared: () => void;
  onError: (error: Error) => void;
  onLog: (log: SuggestionFetchLog) => void;
}
