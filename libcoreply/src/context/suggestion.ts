import { PUNCTUATIONS } from "../constants";

export const PENDING = Symbol("PENDING");

/**
 * Handles suggestion caching and retrieval based on typing text
 * Uses a history map to store suggestions keyed by normalized text
 */
export class SuggestionStorage {
  private readonly history = new Map<string, string | typeof PENDING>();
  private readonly sentenceSegmenter = new Intl.Segmenter(undefined, {
    granularity: "sentence",
  });
  private readonly wordSegmenter = new Intl.Segmenter(undefined, {
    granularity: "word",
  });

  clear() {
    this.history.clear();
  }

  setSuggestionPending(text: string): void {
    const key = this.getKeyFromText(text);
    this.history.set(key, PENDING);
  }

  clearSuggestionPending(text: string): void {
    const key = this.getKeyFromText(text);
    if (this.history.get(key) === PENDING) {
      this.history.delete(key);
    }
  }

  private splitIntoSuggestionChunks(text: string): string[] {
    const trimmed = text.trimEnd();
    if (!trimmed) {
      return [];
    }

    const chunks: string[] = [];
    let carry = "";

    for (const sentenceSegment of this.sentenceSegmenter.segment(trimmed)) {
      const sentence = sentenceSegment.segment;
      const wordSegments = Array.from(this.wordSegmenter.segment(sentence));
      const lastWordLikeIndex = wordSegments.findLastIndex(
        (segment) => segment.isWordLike === true,
      );

      if (lastWordLikeIndex === -1) {
        carry += sentence;
        continue;
      }

      let splitIndex = wordSegments.length;
      while (splitIndex > lastWordLikeIndex + 1) {
        const trailingSegment = wordSegments[splitIndex - 1];
        if (
          trailingSegment.isWordLike === true ||
          trailingSegment.segment.trim().length > 0
        ) {
          break;
        }
        splitIndex -= 1;
      }

      const chunk =
        carry +
        wordSegments
          .slice(0, splitIndex)
          .map((segment) => segment.segment)
          .join("");
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }

      carry = wordSegments
        .slice(splitIndex)
        .map((segment) => segment.segment)
        .join("");
    }

    if (carry.trim().length > 0) {
      if (chunks.length === 0) {
        chunks.push(carry);
      } else {
        chunks[chunks.length - 1] += carry;
      }
    }

    return chunks;
  }

  private getKeyFromText(text: string): string {
    let key = text.trim();
    for (const punctuation of PUNCTUATIONS) {
      key = key.replaceAll(punctuation, "");
    }
    key = key.replaceAll(" ", "").toLowerCase();
    const lastChar = text.at(-1) ?? "";
    if (text && PUNCTUATIONS.has(lastChar)) {
      key += "-";
    }
    return key;
  }

  private normalizeWhitespace(value: string | null | undefined): string {
    return (value ?? "").replace(/\s+/g, " ");
  }

  private trimMessagePrefix(value: string | null | undefined): string {
    const text = value ?? "";
    if (text.startsWith("Message I sent: ")) {
      return text.slice("Message I sent: ".length);
    }
    if (text.startsWith("Message I received: ")) {
      return text.slice("Message I received: ".length);
    }
    return text;
  }

  getSuggestion(text: string): string | null | typeof PENDING {
    if (text.trim() === "" && this.history.has("")) {
      const stored = this.history.get("");
      return stored ?? null;
    }
    for (let index = 0; index <= text.length; index += 1) {
      const target = this.getKeyFromText(text.slice(0, index));
      const stored = this.history.get(target);
      if (!stored) {
        continue;
      }
      if (stored === PENDING) {
        return PENDING;
      }
      const starting = text.slice(index);
      if (
        !starting ||
        (stored.startsWith(starting) && stored.length > starting.length)
      ) {
        return stored.slice(starting.length);
      }
    }
    return null;
  }

  // ** Updated to use just current typing text instead of full TypingInfo
  updateSuggestion(
    currentTyping: string,
    suggestion: string,
  ): string | null | typeof PENDING {
    const normalizedSuggestion = this.trimMessagePrefix(
      this.normalizeWhitespace(suggestion),
    ).toLowerCase();
    const normalizedTyping = this.trimMessagePrefix(
      this.normalizeWhitespace(currentTyping),
    ).toLowerCase();
    if (!normalizedSuggestion.startsWith(normalizedTyping)) {
      return null;
    }
    const frontTrimmedSuggestion = this.trimMessagePrefix(
      this.normalizeWhitespace(suggestion),
    ).slice(
      this.trimMessagePrefix(this.normalizeWhitespace(currentTyping)).length,
    );
    const parts = this.splitIntoSuggestionChunks(frontTrimmedSuggestion);
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = this.getKeyFromText(
        `${currentTyping}${parts.slice(0, index + 1).join("")}`,
      );
      const existing = this.history.get(key);
      if (existing === undefined || existing === PENDING) {
        this.history.set(key, parts[index + 1]);
      }
    }
    const rootKey = this.getKeyFromText(currentTyping);
    const existingRoot = this.history.get(rootKey);
    if (existingRoot === undefined || existingRoot === PENDING) {
      this.history.set(rootKey, parts[0] ?? "");
    }
    return this.getSuggestion(currentTyping);
  }
}
