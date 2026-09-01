// ** Defined Base Context interface with profileId field
/* A Base Context contains:
- the type field: 'chat' | 'screen'
- the id of the profile extracting the context
- a label that identifies the type of the context in a more granular way, e.g. 'messages', 'post', etc.
- typed fields that carries the context
- A tryUpdate() method that takes in a structured data from the extractor, it tries and decides whether to update the existing context using the supplied data, and returns a boolean of whether the supplied data is taken into the context
- profileId: identifies which profile extracted the context, used for context dropping when profile changes
*/

import type { DropRule } from "../profile";
import { PENDING } from "./suggestion";

export interface BaseContext {
  profileId: string;
  dropRule: DropRule;
  label?: string;
  getSuggestion(text: string): string | null | typeof PENDING;
  updateSuggestion(currentTyping: string, suggestion: string): string | null | typeof PENDING;
  clearSuggestions(): void;
  setSuggestionPending(text: string): void;
  clearSuggestionPending(text: string): void;
  tryUpdate(data: any): boolean;
}
