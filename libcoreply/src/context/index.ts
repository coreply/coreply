import {
  ChatContextImpl,
  type ChatContext,
} from "./chat";
import {
  ScreenContextImpl,
  type ScreenContext,
} from "./screen";
import type { BaseContextSerialized } from "./base";
import type { Profile } from "../profile";

export * from "./payload";
export * from "./suggestion";
export * from "./store";
export * from "./chat";
export * from "./screen";
export * from "./base";

export type CoreplyContext = ChatContext | ScreenContext;

export type SerializedContext =
  | BaseContextSerialized<"chat", ChatContext["data"]>
  | BaseContextSerialized<"screen", ScreenContext["data"]>;

export function deserializeContext(
  context: SerializedContext,
  profile: Profile,
): CoreplyContext {
  if (context.type === "chat") {
    return new ChatContextImpl(profile, context.data);
  }

  return new ScreenContextImpl(profile, context.data);
}
