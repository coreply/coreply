import type { Profile } from "../profile";
import Mustache from "mustache";
import { PENDING, SuggestionStorage } from "./suggestion";

export interface BaseContextSerialized<Type extends string, Data> {
  type: Type;
  data: Data;
}

export abstract class BaseContext<Type extends string, Data> {
  abstract type: Type;
  profile: Profile;
  label?: string;
  abstract data: Data;
  abstract contextTemplate: string;
  abstract contextTemplatePartial: string;

  private readonly suggestionStorage = new SuggestionStorage();

  constructor(profile: Profile, label?: string) {
    this.profile = profile;
    this.label = label;
  }

  toJSON(): BaseContextSerialized<Type, Data> {
    return {
      type: this.type,
      data: this.data,
    };
  }

  clearSuggestions(): void {
    this.suggestionStorage.clear();
  }

  setSuggestionPending(text: string): void {
    this.suggestionStorage.setSuggestionPending(text);
  }

  clearSuggestionPending(text: string): void {
    this.suggestionStorage.clearSuggestionPending(text);
  }

  getSuggestion(text: string): string | null | typeof PENDING {
    return this.suggestionStorage.getSuggestion(text);
  }

  updateSuggestion(
    currentTyping: string,
    suggestion: string,
  ): string | null | typeof PENDING {
    return this.suggestionStorage.updateSuggestion(currentTyping, suggestion);
  }

  renderPrompt(): string {
    return Mustache.render(
      this.contextTemplate,
      this.toJSON(),
      { item: this.contextTemplatePartial },
      {
        escape: (value) => value,
      },
    );
  }

  abstract tryUpdate(data: BaseContext<Type, Data>): boolean;
}
