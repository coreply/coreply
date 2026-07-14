import Mustache from "mustache";
import type { providerDefinitions } from "./index";
import type { TypingInfo } from "../context";

export async function generateWithAdvanced(
  providerDefinition: typeof providerDefinitions.advanced,
  settingsByReference: any,
  typingInfo: TypingInfo,
): Promise<string> {
  const settings = providerDefinition.settingsSchema.parse(settingsByReference);
  const bodyTemplate = Mustache.render(
    settings.templates.bodyTemplate,
    typingInfo.contextMap,
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
    ...typingInfo.contextMap,
    assistantMessage,
    assistantMessageAutoTrimCurrentTyping: assistantMessage.startsWith(
      typingInfo.currentTyping,
    )
      ? assistantMessage.slice(typingInfo.currentTyping.length)
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
