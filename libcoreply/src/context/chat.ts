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
import { SuggestionStorage } from "./suggestion";

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

// Helper type for flattened message representation with sender context
interface MessageWithSender {
  sender?: string;
  userSent: boolean;
  body: string;
  time?: string;
  quote?: string;
}

// Flatten turns to MessageWithSender array
function flattenToMessages(turns: ChatTurn[]): MessageWithSender[] {
  return turns.flatMap((turn) =>
    turn.messages.map((msg) => ({
      sender: turn.sender,
      userSent: turn.userSent,
      body: msg.body,
      time: msg.time,
      quote: msg.quote,
    })),
  );
}

// Find the longest contiguous matching sequence between two message arrays
function findLongestContiguousMatch(
  a: MessageWithSender[],
  b: MessageWithSender[],
): MessageWithSender[] | null {
  if (a.length === 0 || b.length === 0) return null;

  let maxMatch: MessageWithSender[] | null = null;

  // Try all possible starting positions in a
  for (let i = 0; i < a.length; i++) {
    // Try all possible lengths from this position
    for (let len = Math.min(a.length - i, b.length); len >= 1; len--) {
      const candidate = a.slice(i, i + len);

      // Require a real anchor: either at least 3 messages, or a 2-message anchor
      // where at least one message is meaningfully long to avoid short common phrases.
      const isValidAnchor =
        candidate.length >= 3 ||
        (candidate.length === 2 &&
          candidate.some((msg) => msg.body.trim().length > 5)) ||
        (a.length === 1 && b.length === 1); // Allow single-message match if both arrays are single-message

      if (!isValidAnchor) {
        continue;
      }

      // Check if candidate appears contiguously in b
      for (let j = 0; j <= b.length - len; j++) {
        const match = b.slice(j, j + len);
        if (sequencesMatch(candidate, match)) {
          if (!maxMatch || len > maxMatch.length) {
            maxMatch = candidate;
          }
          // Found the longest possible match from this position, move to next
          break;
        }
      }
      // If we found a match at this position, no need to check shorter lengths
      if (maxMatch && maxMatch.length === len) break;
    }
  }

  return maxMatch;
}

// Check if two message sequences match (by body, then time/sender/userSent)
function sequencesMatch(
  a: MessageWithSender[],
  b: MessageWithSender[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].body !== b[i].body) return false;
    // If body matches but time is present in both, check time too
    if (a[i].time && b[i].time && a[i].time !== b[i].time) return false;
    // If body matches but sender is present in both, check sender too
    if (a[i].sender && b[i].sender && a[i].sender !== b[i].sender) return false;
    if (a[i].userSent !== b[i].userSent) return false;
  }
  return true;
}

// Split array at first occurrence of sequence, returning before and after parts
function splitAtSequence(
  arr: MessageWithSender[],
  seq: MessageWithSender[],
): { before: MessageWithSender[]; after: MessageWithSender[] } {
  if (seq.length === 0) return { before: arr, after: [] };

  for (let i = 0; i <= arr.length - seq.length; i++) {
    const slice = arr.slice(i, i + seq.length);
    if (sequencesMatch(slice, seq)) {
      return {
        before: arr.slice(0, i),
        after: arr.slice(i + seq.length),
      };
    }
  }

  // Sequence not found, return entire array as before, empty after
  return { before: arr, after: [] };
}

// Rebuild turns from MessageWithSender array
function rebuildTurns(msgs: MessageWithSender[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  let currentTurn: ChatTurn | null = null;

  for (const msg of msgs) {
    if (
      !currentTurn ||
      currentTurn.sender !== msg.sender ||
      currentTurn.userSent !== msg.userSent
    ) {
      currentTurn = {
        sender: msg.sender,
        userSent: msg.userSent,
        messages: [],
      };
      turns.push(currentTurn);
    }
    currentTurn.messages.push({
      body: msg.body,
      time: msg.time,
      quote: msg.quote,
    });
  }

  return turns;
}

// ** Implemented tryUpdate for ChatContext
// Uses anchor-based merging: finds longest contiguous match, then takes longer prefix/suffix
export class ChatContextImpl implements ChatContext {
  type: "chat" = "chat";
  profileId: string;
  label?: string;
  data: ChatContextData;
  private readonly suggestionStorage = new SuggestionStorage();

  constructor(profileId: string, data: ChatContextData, label?: string) {
    this.profileId = profileId;
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

  tryUpdate(incomingContext: ChatContext): boolean {
    const incomingData = incomingContext.data;
    const incomingTurns = incomingData.turns;
    const existingTurns = this.data.turns;

    if (incomingTurns.length === 0) {
      return false;
    }

    // Flatten to MessageWithSender for easier comparison
    const existingMsgs = flattenToMessages(existingTurns);
    const incomingMsgs = flattenToMessages(incomingTurns);

    // Find longest contiguous matching sequence (anchor)
    const anchor = findLongestContiguousMatch(existingMsgs, incomingMsgs);
    if (!anchor) {
      return false;
    }

    // Split both at anchor
    const { before: existingBefore, after: existingAfter } = splitAtSequence(
      existingMsgs,
      anchor,
    );
    const { before: incomingBefore, after: incomingAfter } = splitAtSequence(
      incomingMsgs,
      anchor,
    );

    // Take longer prefix and suffix
    const before =
      existingBefore.length >= incomingBefore.length
        ? existingBefore
        : incomingBefore;
    const after =
      existingAfter.length >= incomingAfter.length
        ? existingAfter
        : incomingAfter;

    // Merge and rebuild turns
    const mergedMsgs = [...before, ...anchor, ...after];
    const mergedTurns = rebuildTurns(mergedMsgs);

    // Preserve metadata: use incoming if present, otherwise keep existing
    this.data = {
      id: incomingData.id ?? this.data.id,
      title: incomingData.title ?? this.data.title,
      turns: mergedTurns,
    };

    return true;
  }
}
