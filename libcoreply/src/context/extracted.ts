import type { ChatContextData, ChatMessage, ChatTurn } from "./chat";
import type { ScreenContextData } from "./screen";

type SnapshotFrequency = "minimal" | "frequent" | "active";

type ExtractedContextResult =
  | ({
      type: "chat";
      label?: string;
      snapshotFrequency?: SnapshotFrequency;
    } & ChatContextData)
  | ({
      type: "screen";
      label?: string;
      snapshotFrequency?: SnapshotFrequency;
    } & ScreenContextData);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T>(value: T | T[] | null | undefined): T[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

const normalizeSnapshotFrequency = (
  value: unknown,
): SnapshotFrequency | undefined =>
  value === "minimal" || value === "frequent" || value === "active"
    ? value
    : undefined;

const normalizeChatMessage = (value: unknown): ChatMessage | null => {
  if (!isObject(value) || typeof value.body !== "string") {
    return null;
  }

  return {
    body: value.body,
    ...(typeof value.time === "string" ? { time: value.time } : {}),
    ...(typeof value.quote === "string" ? { quote: value.quote } : {}),
  };
};

const normalizeChatTurn = (value: unknown): ChatTurn | null => {
  if (!isObject(value) || typeof value.userSent !== "boolean") {
    return null;
  }

  const messages = asArray(value.messages)
    .map(normalizeChatMessage)
    .filter((message): message is ChatMessage => message !== null);

  if (messages.length === 0) {
    return null;
  }

  return {
    ...(typeof value.sender === "string" ? { sender: value.sender } : {}),
    userSent: value.userSent,
    messages,
  };
};

const normalizeScreenContextData = (value: unknown): ScreenContextData | null => {
  if (!isObject(value)) {
    return null;
  }

  const hasExplicitChildrenArray = Array.isArray(value.children);
  const children = asArray(value.children)
    .map(normalizeScreenContextData)
    .filter((child): child is ScreenContextData => child !== null);
  const text = typeof value.text === "string" ? value.text : undefined;

  if (
    text === undefined &&
    children.length === 0 &&
    !hasExplicitChildrenArray
  ) {
    return null;
  }

  return {
    ...(text !== undefined ? { text } : {}),
    children,
  };
};

export function normalizeExtractedContextData(
  value: unknown,
): ExtractedContextResult | null {
  if (!isObject(value)) {
    return null;
  }

  const snapshotFrequency = normalizeSnapshotFrequency(value.snapshotFrequency);
  const base = {
    ...(typeof value.label === "string" ? { label: value.label } : {}),
    ...(snapshotFrequency ? { snapshotFrequency } : {}),
  };

  if (value.type === "chat") {
    const turns = asArray(value.turns)
      .map(normalizeChatTurn)
      .filter((turn): turn is ChatTurn => turn !== null);

    if (turns.length === 0) {
      return null;
    }

    return {
      type: "chat",
      ...base,
      ...(typeof value.id === "string" ? { id: value.id } : {}),
      ...(typeof value.title === "string" ? { title: value.title } : {}),
      turns,
    };
  }

  if (value.type === "screen") {
    const data = normalizeScreenContextData(value);
    if (!data) {
      return null;
    }

    return {
      type: "screen",
      ...base,
      ...data,
    };
  }

  return null;
}
