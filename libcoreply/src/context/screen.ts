// ** Implemented ScreenContext with tryUpdate method
/* 'screen' type context, nested object of:
- text (optional): text content of the element
- children[] (optional): array of child elements containing text
*/

import type { BaseContext } from "./base";
import type { DropRule } from "../profile";
import { SuggestionStorage } from "./suggestion";

export interface ScreenContextData {
  text?: string;
  children?: ScreenContextData[];
}

export interface ScreenContext extends BaseContext {
  type: "screen";
  data: ScreenContextData;
  tryUpdate(incomingContext: ScreenContext): boolean;
}

// Flatten a nested screen-context tree into a flat list of non-empty text nodes
// (pre-order traversal), so structural nesting depth does not affect matching.
function flattenToTexts(data: ScreenContextData): string[] {
  const texts: string[] = [];
  const walk = (node: ScreenContextData) => {
    if (node.text && node.text.trim()) {
      texts.push(node.text);
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };
  walk(data);
  return texts;
}

// Find the longest contiguous matching sequence of text nodes between two arrays.
// A match is a reliable common part only when it is a meaningful anchor:
// at least 3 nodes, or 2 nodes where one is longer than 5 chars, or a single
// node when both arrays consist of a single node.
function findLongestContiguousMatch(
  a: string[],
  b: string[],
): string[] | null {
  if (a.length === 0 || b.length === 0) return null;

  let maxMatch: string[] | null = null;

  for (let i = 0; i < a.length; i++) {
    for (let len = Math.min(a.length - i, b.length); len >= 1; len--) {
      const candidate = a.slice(i, i + len);

      const isValidAnchor =
        candidate.length >= 3 ||
        (candidate.length === 2 &&
          candidate.some((t) => t.trim().length > 5)) ||
        (a.length === 1 && b.length === 1);

      if (!isValidAnchor) {
        continue;
      }

      for (let j = 0; j <= b.length - len; j++) {
        const match = b.slice(j, j + len);
        if (candidate.every((t, k) => t === match[k])) {
          if (!maxMatch || len > maxMatch.length) {
            maxMatch = candidate;
          }
          break;
        }
      }
      if (maxMatch && maxMatch.length === len) break;
    }
  }

  return maxMatch;
}

function totalTextLength(texts: string[]): number {
  return texts.reduce((sum, t) => sum + t.length, 0);
}

// ** Implemented tryUpdate for ScreenContext
// Flattens the nested tree to text nodes, detects a reliable common part
// (anchor) against the existing context, and takes the larger context.
export class ScreenContextImpl implements ScreenContext {
  type: "screen" = "screen";
  profileId: string;
  dropRule: DropRule;
  label?: string;
  data: ScreenContextData;
  private readonly suggestionStorage = new SuggestionStorage();

  constructor(profileId: string, dropRule: DropRule, data: ScreenContextData, label?: string) {
    this.profileId = profileId;
    this.dropRule = dropRule;
    this.label = label;
    this.data = data;
  }

  getSuggestion(text: string): string | null {
    return this.suggestionStorage.getSuggestion(text);
  }

  updateSuggestion(currentTyping: string, suggestion: string): string | null {
    return this.suggestionStorage.updateSuggestion(currentTyping, suggestion);
  }

  clearSuggestions(): void {
    this.suggestionStorage.clear();
  }

  tryUpdate(incomingContext: ScreenContext): boolean {
    const incomingData = incomingContext.data;

    // Flatten the nested trees so matching works regardless of how deep text
    // is nested in children (the root node often carries no text itself).
    const existingTexts = flattenToTexts(this.data);
    const incomingTexts = flattenToTexts(incomingData);

    if (incomingTexts.length === 0) {
      return false;
    }

    // Detect a reliable common part (anchor) between the two contexts.
    const anchor = findLongestContiguousMatch(existingTexts, incomingTexts);
    if (!anchor) {
      return false;
    }

    // A common part was detected: this is the same screen view. Take the larger
    // context so scrolling or partial updates converge to the fuller snapshot.
    if (totalTextLength(incomingTexts) > totalTextLength(existingTexts)) {
      this.data = incomingData;
    }
    return true;
  }
}
