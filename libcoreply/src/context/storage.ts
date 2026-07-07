import { PUNCTUATIONS } from "../constants";
import type { TypingInfo } from "./payload";

export class SuggestionStorage {
    private readonly history = new Map<string, string>();

    clear() {
        this.history.clear();
    }

    private splitAndKeepPunctuations(text: string): string[] {
        const segmenter = new Intl.Segmenter('en', {
            granularity: 'word',
        });

        let tokens = Array.from(
            segmenter.segment(text),
            (segment) => segment.segment,
        ).filter((s) => s.trim().length > 0);

        // Merge trailing punctuation with previous token (matching native behavior)
        if (tokens.length >= 2) {
            const lastToken = tokens[tokens.length - 1];
            if (lastToken.length === 1 && PUNCTUATIONS.has(lastToken)) {
                tokens = tokens.slice(0, -2);
                tokens.push(tokens[tokens.length - 1] + lastToken);
            }
        }

        return tokens;
    }

    private getKeyFromText(text: string): string {
        let key = text.trim();
        for (const punctuation of PUNCTUATIONS) {
            key = key.replaceAll(punctuation, '');
        }
        key = key.replaceAll(' ', '').toLowerCase();
        const lastChar = text.at(-1) ?? '';
        if (text && PUNCTUATIONS.has(lastChar)) {
            key += '-';
        }
        return key;
    }

    private normalizeWhitespace(value: string | null | undefined): string {
        return (value ?? '').replace(/\s+/g, ' ');
    }

    private trimMessagePrefix(value: string | null | undefined): string {
        const text = value ?? '';
        if (text.startsWith('Message I sent: ')) {
            return text.slice('Message I sent: '.length);
        }
        if (text.startsWith('Message I received: ')) {
            return text.slice('Message I received: '.length);
        }
        return text;
    }

    getSuggestion(text: string): string | null {
        if (text.trim() === '' && this.history.has('')) {
            return this.history.get('') ?? null;
        }
        for (let index = 0; index <= text.length; index += 1) {
            const target = this.getKeyFromText(text.slice(0, index));
            const stored = this.history.get(target);
            if (!stored) {
                continue;
            }
            const starting = text.slice(index);
            if (!starting || (stored.startsWith(starting) && stored.length > starting.length)) {
                return stored.slice(starting.length);
            }
        }
        return null;
    }

    updateSuggestion(typingInfo: TypingInfo, suggestion: string): string | null {
        const normalizedSuggestion = this.trimMessagePrefix(this.normalizeWhitespace(suggestion)).toLowerCase();
        const normalizedTyping = this.trimMessagePrefix(this.normalizeWhitespace(typingInfo.currentTyping)).toLowerCase();
        if (!normalizedSuggestion.startsWith(normalizedTyping)) {
            return null;
        }
        const frontTrimmedSuggestion = this.trimMessagePrefix(this.normalizeWhitespace(suggestion)).slice(
            this.trimMessagePrefix(this.normalizeWhitespace(typingInfo.currentTyping)).length,
        );
        const parts = this.splitAndKeepPunctuations(frontTrimmedSuggestion);
        for (let index = 0; index < parts.length - 1; index += 1) {
            const key = this.getKeyFromText(`${typingInfo.currentTyping}${parts.slice(0, index + 1).join('')}`);
            if (!this.history.has(key)) {
                this.history.set(key, parts[index + 1]);
            }
        }
        const rootKey = this.getKeyFromText(typingInfo.currentTyping);
        if (!this.history.has(rootKey)) {
            this.history.set(rootKey, parts[0] ?? '');
        }
        return this.getSuggestion(typingInfo.currentTyping);
    }
}