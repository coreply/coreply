// ** Implemented buildChatPrompt and buildScreenPrompt helper functions
// Constructs prompts from the new ChatContext and ScreenContext formats (not legacy ChatContents)

import type { ChatContextData } from "../context/chat";
import type { ScreenContextData } from "../context/screen";

// ** Implemented buildChatPrompt and buildScreenPrompt for new context format
export function buildChatPrompt(chatData: ChatContextData): string {
  const turns = chatData.turns;

  if (!turns || turns.length === 0) {
    return "";
  }

  const messages: string[] = [];

  for (const turn of turns) {
    for (const message of turn.messages) {
      if (turn.userSent) {
        messages.push(`Message I sent:\n${message.body}\n`);
      } else if (turn.sender) {
        messages.push(
          `Message I received from ${turn.sender}:\n${message.body}\n`,
        );
      } else {
        messages.push(`Message I received:\n${message.body}\n`);
      }
    }
  }

  return messages.join("");
}

export function buildScreenPrompt(
  screenData: ScreenContextData,
  indent: number = 0,
  isRoot: boolean = true,
): string {
  const text = screenData.text;
  const children = screenData.children;

  if (!text && (!children || children.length === 0)) {
    return "";
  }

  const parts: string[] = [];
  const currentIndent = "  ".repeat(indent);

  if (isRoot) {
    parts.push("Text on a screen\n");
  }

  if (text && text.trim()) {
    parts.push(`${currentIndent}${text}\n`);
  }

  if (children && children.length > 0) {
    for (const child of children) {
      const childText = buildScreenPrompt(
        child,
        text ? indent + 1 : indent,
        false,
      );
      if (childText) {
        parts.push(childText);
      }
    }
  }

  return parts.join("");
}

// ** Added buildScreenPrompt for ScreenContextData to construct prompts from screen context
