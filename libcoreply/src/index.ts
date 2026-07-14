import debounce, { type DebouncedFunction } from "debounce";
import Mustache from "mustache";
import { DEFAULT_GLOBAL_SETTINGS, type CoreplySettings } from "./settings";
import {
  ChatContents,
  type ChatMessage,
  SuggestionStorage,
  TypingInfo,
} from "./context";
import { requestSuggestions } from "./requests";
import type { LibCoreplyListener } from "./listener";

Mustache.escape = (value: string) => value;

export class Coreply {
  private settings: CoreplySettings = {
    globalSettings: DEFAULT_GLOBAL_SETTINGS,
    providerId: "openaiCompatible",
    providerConfig: {},
    selectedApps: [],
  };
  private readonly chatContents = new ChatContents();
  private readonly suggestionStorage = new SuggestionStorage();
  private currentTyping = "";
  private readonly listener: LibCoreplyListener;
  private fetchSuggestionDebounced: DebouncedFunction<
    (typingInfo: TypingInfo) => void
  >;

  constructor(listener: LibCoreplyListener) {
    this.listener = listener;
    this.fetchSuggestionDebounced = this.createFetchSuggestionDebounced(350);
    this.listener.onInit();
  }

  private createFetchSuggestionDebounced(debounceMs: number) {
    return debounce((typingInfo: TypingInfo) => {
      void this.fetchSuggestion(typingInfo);
    }, debounceMs);
  }

  getSettings(): CoreplySettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<CoreplySettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.fetchSuggestionDebounced = this.createFetchSuggestionDebounced(
      this.settings.globalSettings.fetchControl.debounceMs,
    );
  }

  ingestMessages(messages: ChatMessage[]) {
    const clearSuggestions = this.chatContents.combine(messages);
    if (clearSuggestions) {
      this.suggestionStorage.clear();
      this.listener.onSuggestionCleared();
      this.emitSuggestion();
    }
  }

  updateTyping(currentTyping: string) {
    if (currentTyping === this.currentTyping) {
      return;
    }
    this.currentTyping = currentTyping;
    this.emitSuggestion();
  }

  reset() {
    this.fetchSuggestionDebounced.clear();
    this.chatContents.clear();
    this.suggestionStorage.clear();
    this.listener.onSuggestionCleared();
  }

  private emitSuggestion() {
    const typingInfo = new TypingInfo(this.chatContents, this.currentTyping);
    if (!this.shouldSuggestForCurrentTyping(typingInfo)) {
      return;
    }
    const cached = this.suggestionStorage.getSuggestion(
      typingInfo.currentTyping,
    );
    if (cached !== null) {
      this.listener.onSuggestionUpdated(`${typingInfo.currentTyping}${cached}`);
      return;
    }
    this.fetchSuggestionDebounced(typingInfo);
  }

  private shouldSuggestForCurrentTyping(typingInfo: TypingInfo) {
    if (
      !typingInfo.currentTyping &&
      typingInfo.pastMessages.chatContents.length === 0
    ) {
      return false;
    }
    if (
      !this.settings.globalSettings.fetchControl.typingRegexEnabled ||
      !this.settings.globalSettings.fetchControl.typingRegexPattern
    ) {
      return true;
    }

    try {
      const regex = new RegExp(
        this.settings.globalSettings.fetchControl.typingRegexPattern,
      );
      return regex.test(typingInfo.currentTyping);
    } catch {
      return true;
    }
  }

  private async fetchSuggestion(typingInfo: TypingInfo) {
    try {
      const suggestion = await requestSuggestions(
        typingInfo,
        this.settings.providerId,
        this.settings.providerConfig,
      );
      const normalized = suggestion.replace(/\n/g, " ");
      const finalSuggestion = normalized.startsWith(" ")
        ? ` ${normalized.trim()}`
        : normalized.trimEnd();
      const cached = this.suggestionStorage.updateSuggestion(
        typingInfo,
        finalSuggestion,
      );
      if (cached !== null) {
        this.listener.onSuggestionUpdated(
          `${typingInfo.currentTyping}${cached}`,
        );
      }
    } catch (error) {
      console.log("Error fetching suggestion:", error);
      this.listener.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}

export * from "./settings";
export * from "./form-metadata";
export * from "./context";
export * from "./requests";
export * from "./providers";
export * from "./listener";
