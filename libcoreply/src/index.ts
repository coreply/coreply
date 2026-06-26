import Mustache from "mustache";
import {
  type GlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_ADVANCED_BODY,
} from "./settings";
import {
  ChatContents,
  type ChatMessage,
  SuggestionStorage,
  TypingInfo,
} from "./context";
import { z } from "zod";
import { requestSuggestions } from "./requests";
import type { LibCoreplyListener } from "./listener";

Mustache.escape = (value: string) => value;

export class Coreply {
  private settings: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
  private readonly chatContents = new ChatContents();
  private readonly suggestionStorage = new SuggestionStorage();
  private currentTyping = "";
  private readonly listener: LibCoreplyListener;

  constructor(listener: LibCoreplyListener) {
    this.listener = listener;
    this.listener.onInit();
  }

  getSettings(): GlobalSettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<GlobalSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
  }

  ingestMessages(messages: ChatMessage[]) {
    const clearSuggestions = this.chatContents.combine(messages);
    if (clearSuggestions) {
      this.suggestionStorage.clear();
      this.listener.onSuggestionUpdated("");
    }
  }

  updateTyping(currentTyping: string) {
    this.currentTyping = currentTyping;
    this.emitCachedSuggestionOrSchedule();
  }

  reset() {
    this.chatContents.clear();
    this.suggestionStorage.clear();
  }

  private emitCachedSuggestionOrSchedule() {
    const cached = this.suggestionStorage.getSuggestion(this.currentTyping);
    if (cached !== null) {
      this.listener.onSuggestionUpdated(cached);
      return;
    }
    this.scheduleSuggestion();
  }

  private scheduleSuggestion() {
    this.fetchSuggestion();
  }

  private buildTypingInfo(): TypingInfo {
    return new TypingInfo(this.chatContents, this.currentTyping);
  }

  private async fetchSuggestion() {
    const typingInfo = this.buildTypingInfo();
    if (
      !typingInfo.currentTyping &&
      typingInfo.pastMessages.chatContents.length === 0
    ) {
      return;
    }
    if (this.settings.typingRegexEnabled && this.settings.typingRegexPattern) {
      try {
        const regex = new RegExp(this.settings.typingRegexPattern);
        if (!regex.test(typingInfo.currentTyping)) {
          return;
        }
      } catch {
        // Ignore invalid regex and continue with suggestion generation.
      }
    }
    try {
      const suggestion = await requestSuggestions(typingInfo, this.settings);
      const normalized = suggestion.replace(/\n/g, " ");
      const finalSuggestion = normalized.startsWith(" ")
        ? ` ${normalized.trim()}`
        : normalized.trimEnd();
      const cached = this.suggestionStorage.updateSuggestion(
        typingInfo,
        finalSuggestion,
      );
      if (cached !== null) {
        this.listener.onSuggestionUpdated(cached);
      }
    } catch (error) {
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
