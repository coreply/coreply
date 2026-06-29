import debounce, { type DebouncedFunction } from "debounce";
import Mustache from "mustache";
import {
  DEFAULT_FETCH_CONTROL_SETTINGS,
  DEFAULT_PRESENTATION_SETTINGS,
  globalSettingsSchema,
} from "./settings";
import {
  ChatContents,
  type ChatMessage,
  SuggestionStorage,
  TypingInfo,
} from "./context";
import { requestSuggestions } from "./requests";
import type { LibCoreplyListener } from "./listener";
import { z } from "zod";

Mustache.escape = (value: string) => value;

export const coreplySettingsSchema = z.object({
  globalSettings: globalSettingsSchema,
  providerId: z.string(),
  providerSettings: z.record(z.string(), z.unknown()),
  generationSettings: z.record(z.string(), z.unknown()),
});

export type CoreplySettings = z.infer<typeof coreplySettingsSchema>;

export class Coreply {
  private settings: CoreplySettings = {
    globalSettings: {
      ...DEFAULT_FETCH_CONTROL_SETTINGS,
      ...DEFAULT_PRESENTATION_SETTINGS,
    },
    providerId: "openaiCompatible",
    providerSettings: {},
    generationSettings: {},
  };
  private readonly chatContents = new ChatContents();
  private readonly suggestionStorage = new SuggestionStorage();
  private currentTyping = "";
  private readonly listener: LibCoreplyListener;
  private scheduleSuggestion: DebouncedFunction<() => void>;

  constructor(listener: LibCoreplyListener) {
    this.listener = listener;
    this.scheduleSuggestion = this.createScheduleSuggestion();
    this.listener.onInit();
  }

  getSettings(): CoreplySettings {
    return this.settings;
  }

  updateSettings(newSettings: Partial<CoreplySettings>) {
    const previousDebounceMs = this.settings.globalSettings.debounceMs;
    const hadPendingSuggestion = this.scheduleSuggestion.isPending;
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    if (this.settings.globalSettings.debounceMs !== previousDebounceMs) {
      this.scheduleSuggestion.clear();
      this.scheduleSuggestion = this.createScheduleSuggestion();
      if (hadPendingSuggestion) {
        this.emitCachedSuggestionOrSchedule();
      }
    }
  }

  ingestMessages(messages: ChatMessage[]) {
    const clearSuggestions = this.chatContents.combine(messages);
    if (clearSuggestions) {
      this.suggestionStorage.clear();
      this.listener.onSuggestionCleared();
    }
  }

  updateTyping(currentTyping: string) {
    this.currentTyping = currentTyping;
    this.emitCachedSuggestionOrSchedule();
  }

  reset() {
    this.scheduleSuggestion.clear();
    this.chatContents.clear();
    this.suggestionStorage.clear();
    this.listener.onSuggestionCleared();
  }

  private emitCachedSuggestionOrSchedule() {
    const cached = this.suggestionStorage.getSuggestion(this.currentTyping);
    if (cached !== null) {
      this.scheduleSuggestion.clear();
      this.listener.onSuggestionUpdated(`${this.currentTyping}${cached}`);
      return;
    }
    this.scheduleSuggestion();
  }

  private createScheduleSuggestion() {
    return debounce(() => {
      void this.fetchSuggestion();
    }, this.settings.globalSettings.debounceMs);
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

    if (this.settings.globalSettings.typingRegexEnabled && this.settings.globalSettings.typingRegexPattern) {
      try {
        const regex = new RegExp(this.settings.globalSettings.typingRegexPattern);
        if (!regex.test(typingInfo.currentTyping)) {
          return;
        }
      } catch {
        // Ignore invalid regex and continue with suggestion generation.
      }
    }

    try {
      const suggestion = await requestSuggestions(
        typingInfo,
        this.settings.providerId,
        this.settings.providerSettings,
        this.settings.generationSettings,
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
        this.listener.onSuggestionUpdated(`${typingInfo.currentTyping}${cached}`);
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
export * from "./listener";
