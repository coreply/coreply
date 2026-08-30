import {
  ChatContextImpl,
  type ChatContext,
} from "./chat";
import {
  ScreenContextImpl,
  type ScreenContext,
} from "./screen";

export * from "./payload";
export * from "./suggestion";
export * from "./store";
export * from "./chat";
export * from "./screen";
export * from "./base";

export type CoreplyContext = ChatContext | ScreenContext;

export function deserializeContext(
  context:
    | ReturnType<ChatContextImpl["toJSON"]>
    | ReturnType<ScreenContextImpl["toJSON"]>,
): CoreplyContext {
  if (context.type === "chat") {
    return new ChatContextImpl(
      context.profileId,
      context.dropRule,
      context.data,
      context.label,
    );
  }

  return new ScreenContextImpl(
    context.profileId,
    context.dropRule,
    context.data,
    context.label,
  );
}
