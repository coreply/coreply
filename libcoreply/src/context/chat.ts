// ** Implemented ChatContext with tryUpdate method
/*
Two types of context have two different additional fields:
'chat':
- id (optional): a very definitive identifier that a match 100% guarantees the same chat, but often cannot be parsed from the screen
- title (optional): a good identifier that usually identifies a chat, but can be changed and may have duplicates, such as the contact name.
- turns: a turn can contain consecutive messages sent by the same person
  - sender (optional): parsed name of the sender
  - userSent: boolean indicating if the message is sent (opposite to received)
  - messages[] : 
    - body: message content
    - time (optional)
    - quote (optional): the text the message is quoting
*/

import type { BaseContext } from "./base";

export interface ChatTurn {
  sender?: string;
  userSent: boolean;
  messages: ChatMessage[];
}

export interface ChatMessage {
  body: string;
  time?: string;
  quote?: string;
}

export interface ChatContextData {
  id?: string;
  title?: string;
  turns: ChatTurn[];
}

export interface ChatContext extends BaseContext {
  type: "chat";
  data: ChatContextData;
  tryUpdate(incomingContext: ChatContext): boolean;
}

// ** Implemented tryUpdate for ChatContext
// Checks if incoming data has overlaps and tries to insert before or append to the end
export class ChatContextImpl implements ChatContext {
  type: "chat" = "chat";
  profileId: string;
  label?: string;
  data: ChatContextData;

  constructor(profileId: string, data: ChatContextData, label?: string) {
    this.profileId = profileId;
    this.label = label;
    this.data = data;
  }

  tryUpdate(incomingContext: ChatContext): boolean {
    const incomingData = incomingContext.data;
    const incomingTurns = incomingData.turns;
    const existingTurns = this.data.turns;

    if (incomingTurns.length === 0) {
      return false;
    }

    // Check if we can append incoming turns to the end
    if (existingTurns.length > 0) {
      const lastExistingTurn = existingTurns[existingTurns.length - 1];
      const firstIncomingTurn = incomingTurns[0];

      // Check if the first incoming turn is the same sender as the last existing turn
      // and if the last message of the last existing turn matches the first message of the first incoming turn
      const lastExistingMessage =
        lastExistingTurn.messages[lastExistingTurn.messages.length - 1];
      const firstIncomingMessage = firstIncomingTurn.messages[0];

      if (
        lastExistingTurn.sender === firstIncomingTurn.sender &&
        lastExistingTurn.userSent === firstIncomingTurn.userSent &&
        lastExistingMessage?.body === firstIncomingMessage?.body
      ) {
        // Same turn, append messages
        const updatedTurns = [...existingTurns];
        const lastTurn = { ...updatedTurns[updatedTurns.length - 1] };
        // Skip the first message of incoming turn as it's already in existing
        lastTurn.messages = [
          ...lastTurn.messages,
          ...firstIncomingTurn.messages.slice(1),
        ];
        updatedTurns[updatedTurns.length - 1] = lastTurn;
        // Add remaining incoming turns
        for (let i = 1; i < incomingTurns.length; i++) {
          updatedTurns.push(incomingTurns[i]);
        }
        this.data = { ...this.data, ...incomingData, turns: updatedTurns };
        return true;
      }
    }

    // Check for overlap: if the first incoming turn's first message matches any existing message
    for (let i = 0; i < existingTurns.length; i++) {
      const existingTurn = existingTurns[i];
      for (let j = 0; j < existingTurn.messages.length; j++) {
        const existingMessage = existingTurn.messages[j];
        const firstIncomingTurn = incomingTurns[0];
        const firstIncomingMessage = firstIncomingTurn.messages[0];

        if (
          existingTurn.sender === firstIncomingTurn.sender &&
          existingTurn.userSent === firstIncomingTurn.userSent &&
          existingMessage.body === firstIncomingMessage.body &&
          existingMessage.time === firstIncomingMessage.time
        ) {
          // Found overlap at this point
          const updatedTurns = [...existingTurns.slice(0, i)];
          // Create new turn that combines from the matching point
          const combinedTurn: ChatTurn = {
            sender: firstIncomingTurn.sender,
            userSent: firstIncomingTurn.userSent,
            messages: [
              ...existingTurn.messages.slice(j),
              ...firstIncomingTurn.messages.slice(1),
            ],
          };
          updatedTurns.push(combinedTurn);
          // Add remaining incoming turns
          for (let k = 1; k < incomingTurns.length; k++) {
            updatedTurns.push(incomingTurns[k]);
          }
          this.data = { ...this.data, ...incomingData, turns: updatedTurns };
          return true;
        }
      }
    }

    // No overlap found, return false
    return false;
  }
}
