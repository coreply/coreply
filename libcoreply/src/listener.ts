import type { ChatContextData } from "./context/chat";
import type { ScreenContextData } from "./context/screen";
import type { DropRule } from "./profile";

export type SerializedChatContext = {
  type: "chat";
  profileId: string;
  dropRule: DropRule;
  data: ChatContextData;
  label?: string;
};

export type SerializedScreenContext = {
  type: "screen";
  profileId: string;
  dropRule: DropRule;
  data: ScreenContextData;
  label?: string;
};

export type SerializedCoreplyContext =
  | SerializedChatContext
  | SerializedScreenContext;

export type SuggestionFetchLog =
  | {
      type: "suggestionFetch";
      providerId: string;
      currentTyping: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      contexts: SerializedCoreplyContext[];
      result: {
        type: "success";
        suggestion: string;
      };
    }
  | {
      type: "suggestionFetch";
      providerId: string;
      currentTyping: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      contexts: SerializedCoreplyContext[];
      result: {
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
