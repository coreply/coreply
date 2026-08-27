import Mustache from "mustache";
import type { providerDefinitions } from "./index";
import type { ChatContext, CoreplyContext } from "../context";
import { TypingInfo } from "../context";
import { ChatContents } from "../context/legacy-chat";

function buildChatContents(chatContexts: ChatContext[]): ChatContents {
  const chatContents = new ChatContents();
  for (const context of chatContexts) {
    for (const turn of context.data.turns) {
      for (const message of turn.messages) {
        chatContents.addMessage({
          sender: turn.sender ?? (turn.userSent ? "Me" : "Others"),
          message: message.body,
        });
      }
    }
  }
  return chatContents;
}

export function buildAdvancedContextMap(
  contexts: CoreplyContext[],
  currentTyping: string,
  pkgName = "",
): Record<string, unknown> {
  const chatContexts = contexts.filter(
    (context): context is ChatContext => context.type === "chat",
  );
  const chatContents = buildChatContents(chatContexts);
  const typingInfo = new TypingInfo(chatContents, currentTyping, pkgName);

  return {
    ...typingInfo.contextMap,
    contexts,
    contextsJson: JSON.stringify(contexts),
  };
}

// ** Updated to use TypingInfo.contextMap (v2-compatible) with v3 fields on top
export async function generateWithAdvanced(
  providerDefinition: typeof providerDefinitions.advanced,
  settingsByReference: any,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  const settings = providerDefinition.settingsSchema.parse(settingsByReference);
  const pkgName = "";

  const contextMap = buildAdvancedContextMap(contexts, currentTyping, pkgName);

  const chatContexts = contexts.filter(
    (context): context is ChatContext => context.type === "chat",
  );
  const chatContents = buildChatContents(chatContexts);
  const typingInfo = new TypingInfo(chatContents, currentTyping, pkgName);

  const bodyTemplate = Mustache.render(
    settings.templates.bodyTemplate,
    contextMap,
  );

  const response = await fetch(settings.provider.requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.provider.authorizationBearer}`,
      "HTTP-Referer": "https://coreply.app",
      "X-Title": "Coreply: Autocomplete for Texting",
    },
    body: bodyTemplate,
  });

  if (!response.ok) {
    throw new Error(`Advanced request failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const assistantMessage = json.choices?.[0]?.message?.content ?? "";

  const suggestionContext = {
    ...contextMap,
    assistantMessage,
    assistantMessageAutoTrimCurrentTyping: assistantMessage.startsWith(
      currentTyping,
    )
      ? assistantMessage.slice(currentTyping.length)
      : assistantMessage,
    assistantMessageAutoTrimCurrentTypingTrimmed: assistantMessage.startsWith(
      typingInfo.currentTypingTrimmed,
    )
      ? assistantMessage.slice(typingInfo.currentTypingTrimmed.length)
      : assistantMessage,
  };

  return Mustache.render(
    settings.templates.suggestionTemplate || "{{assistantMessage}}",
    suggestionContext,
  ).trim();
}
