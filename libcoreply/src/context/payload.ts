import { PUNCTUATIONS } from "../constants";
import type { ChatContents } from "./chat";

export type TemplateMap = {
	raw: string;
	jsonEscaped: string;
	regexLiteral: string;
	regexLiteralEscaped: string;
};

export type MessageTemplateMap = {
	sent: boolean;
	received: boolean;
	sender: TemplateMap | null;
	content: TemplateMap | null;
};

export type TurnTemplateMap = {
	sent: boolean;
	received: boolean;
	sender: TemplateMap | null;
	messages: MessageTemplateMap[];
};

function jsonEscape(value: string): string {
    return JSON.stringify(value).slice(1, -1);
}

export function toTemplateMap(value: string): TemplateMap | null {
    if (value.length === 0) {
        return null;
    }
    const regexLiteral = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
        raw: value,
        jsonEscaped: jsonEscape(value),
        regexLiteral,
        regexLiteralEscaped: jsonEscape(regexLiteral),
    };
}

function tokenizeText(input: string): string[] {
    if (!input) {
        return [];
    }

    const segmenter = new Intl.Segmenter('en', {
        granularity: 'word',
    });

    const segments = Array.from(
        segmenter.segment(input),
        (segment) => segment.segment,
    );
    const tokens: string[] = [];
    let leadingWhitespace = '';

    for (const segment of segments) {
        if (segment.trim().length === 0) {
            if (tokens.length === 0) {
                leadingWhitespace += segment;
            } else {
                tokens[tokens.length - 1] += segment;
            }
            continue;
        }
        tokens.push(`${leadingWhitespace}${segment}`);
        leadingWhitespace = '';
    }

    // Merge trailing punctuation with previous token (matching native behavior)
    if (tokens.length >= 2) {
        const lastToken = tokens[tokens.length - 1];
        const previousToken = tokens[tokens.length - 2];
        if (lastToken.length === 1 && PUNCTUATIONS.has(lastToken)) {
            tokens.splice(tokens.length - 2, 2, `${previousToken}${lastToken}`);
        }
    }

    return tokens;
}

export class TypingInfo {
    readonly currentTyping: string;
    readonly pastMessages: ChatContents;
    readonly pkgName: string;
    private readonly tokens: string[];

    constructor(chatContents: ChatContents, currentTyping: string, pkgName = '') {
        this.pastMessages = chatContents;
        this.currentTyping = currentTyping;
        this.pkgName = pkgName;
        this.tokens = tokenizeText(currentTyping);
    }

    get currentTypingEndsWithSeparator(): boolean {
        if (!this.currentTyping) {
            return false;
        }
        const lastChar = this.currentTyping.at(-1) ?? '';
        return lastChar === ' ' || PUNCTUATIONS.has(lastChar);
    }

    get currentTypingLastToken(): string {
        return this.tokens.at(-1) ?? '';
    }

    get currentTypingTrimmed(): string {
        return this.tokens.length > 0 ? this.tokens.slice(0, -1).join('') : '';
    }

    get contextMap(): Record<string, unknown> {
        const context: Record<string, unknown> = {
            pastMessages: this.pastMessages.getMessageMapList(),
            currentTyping: toTemplateMap(this.currentTyping),
            currentTypingTrimmed: toTemplateMap(this.currentTypingTrimmed),
            currentTypingLastToken: toTemplateMap(this.currentTypingLastToken),
            currentTypingEndsWithSeparator: this.currentTypingEndsWithSeparator,
            pkgName: toTemplateMap(this.pkgName),
        };
        if (this.pkgName) {
            context[this.pkgName.replaceAll('.', '_')] = true;
        }
        return context;
    }
}
