import { z } from "zod";

import { type TurnTemplateMap, type MessageTemplateMap, toTemplateMap } from './payload';

export const chatMessageSchema = z.object({
    sender: z.string(),
    message: z.string(),
    timestamp: z.number().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

function equalsMessage(left: ChatMessage | undefined, right: ChatMessage | undefined): boolean {
    if (!left || !right) {
        return false;
    }
    return left.sender === right.sender && left.message === right.message && left.timestamp === right.timestamp;
}

function containsMessage(messages: ChatMessage[], target: ChatMessage): boolean {
    return messages.some((message) => equalsMessage(message, target));
}

function sameMessages(left: ChatMessage[], right: ChatMessage[]): boolean {
    if (left.length !== right.length) {
        return false;
    }
    return left.every((message, index) => equalsMessage(message, right[index]));
}

function createTurnMap(messages: ChatMessage[]): TurnTemplateMap[] {
    if (messages.length === 0) {
        return [];
    }
    const normalized = messages.map((message) => ({
        ...message,
        sender: message.sender === 'Me' ? 'Me' : message.sender === 'Others' ? 'Others' : 'OnScreen',
    }));
    const turns: TurnTemplateMap[] = [];
    let currentSender = normalized[0].sender;
    let currentMessages: MessageTemplateMap[] = [];
    for (const message of normalized) {
        if (message.sender !== currentSender) {
            const sent = currentSender === 'Me';
            turns.push({
                sent,
                received: !sent,
                sender: toTemplateMap(currentSender),
                messages: currentMessages,
            });
            currentSender = message.sender;
            currentMessages = [];
        }
        const sent = message.sender === 'Me';
        currentMessages.push({
            sent,
            received: !sent,
            sender: toTemplateMap(message.sender),
            content: toTemplateMap(message.message),
        });
    }
    if (currentMessages.length > 0) {
        const sent = currentSender === 'Me';
        turns.push({
            sent,
            received: !sent,
            sender: toTemplateMap(currentSender),
            messages: currentMessages,
        });
    }
    return turns;
}

export class ChatContents {
    private messages: ChatMessage[] = [];

    get chatContents(): ChatMessage[] {
        return this.messages;
    }

    addMessage(message: ChatMessage) {
        this.messages.push(message);
    }

    clear() {
        this.messages = [];
    }

    combine(other: ChatMessage[]): boolean {
        if (this.messages.length === 0 || other.length === 0) {
            this.messages = [...other];
            return other.length > 0;
        }
        if (sameMessages(this.messages, other)) {
            return false;
        }
        if (containsMessage(this.messages, other[0])) {
            const clearCurrentSuggestions =
                other.at(-1)?.sender === 'Me' &&
                other.length > 1 &&
                equalsMessage(this.messages.at(-1), other[other.length - 2]);
            for (const message of other) {
                if (!containsMessage(this.messages, message)) {
                    this.messages.push(message);
                }
            }
            return Boolean(clearCurrentSuggestions && this.messages.length > 1);
        }
        if (containsMessage(other, this.messages[0])) {
            const merged = [...other];
            for (const message of this.messages) {
                if (!containsMessage(merged, message)) {
                    merged.push(message);
                }
            }
            this.messages = merged;
            return false;
        }
        this.messages = [...other];
        return other.length > 0;
    }

    getMessageMapList(): TurnTemplateMap[] {
        return createTurnMap(this.messages);
    }

    getCoreply2Format(): string {
        return this.messages
            .slice(-20)
            .map((message) => {
                if (message.sender === 'Me') {
                    return `Message I sent:\n${message.message}\n`;
                }
                if (message.sender === 'Others') {
                    return `Message I received:\n${message.message}\n`;
                }
                return `On screen content, unknown sender:\n${message.message}\n`;
            })
            .join('');
    }

    getFIMFormat(): string {
        return this.messages
            .slice(-20)
            .map((message) => {
                if (message.sender === 'Me') {
                    return `send_message("${message.message}")\n`;
                }
                return `mock_received("${message.message}")\n`;
            })
            .join('');
    }
}
