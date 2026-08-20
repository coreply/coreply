import Mustache from "mustache";
import type { providerDefinitions } from "./index";
import type { ChatContext, CoreplyContext } from "../context";
import { PUNCTUATIONS } from "../constants";
import { toTemplateMap } from "../context";

function tokenizeText(input: string): string[] {
  if (!input) {
    return [];
  }

  const segmenter = new Intl.Segmenter("en", {
    granularity: "word",
  });
  const segments = Array.from(
    segmenter.segment(input),
    (segment) => segment.segment,
  );
  const tokens: string[] = [];
  let leadingWhitespace = "";

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
    leadingWhitespace = "";
  }

  if (tokens.length >= 2) {
    const lastToken = tokens[tokens.length - 1];
    const previousToken = tokens[tokens.length - 2];
    if (lastToken.length === 1 && PUNCTUATIONS.has(lastToken)) {
      tokens.splice(tokens.length - 2, 2, `${previousToken}${lastToken}`);
    }
  }

  return tokens;
}

function serializeContexts(contexts: CoreplyContext[]) {
  return contexts.map((context) => ({
    type: context.type,
    profileId: context.profileId,
    label: context.label,
    data: context.data,
  }));
}

function isChatContext(context: CoreplyContext): context is ChatContext {
  return context.type === "chat";
}

// ** Updated to use contexts and currentTyping instead of typingInfo
export async function generateWithAdvanced(
  providerDefinition: typeof providerDefinitions.advanced,
  settingsByReference: any,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  const settings = providerDefinition.settingsSchema.parse(settingsByReference);
  const tokens = tokenizeText(currentTyping);
  const currentTypingTrimmed = tokens.length > 0 ? tokens.slice(0, -1).join("") : "";
  const currentTypingLastToken = tokens.at(-1) ?? "";
  const currentTypingEndsWithSeparator = (() => {
    if (!currentTyping) {
      return false;
    }
    const lastChar = currentTyping.at(-1) ?? "";
    return lastChar === " " || PUNCTUATIONS.has(lastChar);
  })();
  const serializedContexts = serializeContexts(contexts);
  const chatContexts = contexts.filter(isChatContext);
  const pkgName = "";

  const contextMap = {
    contexts: serializedContexts,
    contextsJson: JSON.stringify(serializedContexts),
    pastMessages: chatContexts.flatMap((context) =>
        context.data.turns.map((turn) => ({
          sent: turn.userSent,
          received: !turn.userSent,
          sender: toTemplateMap(turn.sender ?? (turn.userSent ? "Me" : "Others")),
          messages: turn.messages.map((message) => ({
            sent: turn.userSent,
            received: !turn.userSent,
            sender: toTemplateMap(
              turn.sender ?? (turn.userSent ? "Me" : "Others"),
            ),
            content: toTemplateMap(message.body),
          })),
        })),
      ),
    currentTyping: currentTyping,
    currentTypingTrimmed,
    currentTypingLastToken,
    currentTypingEndsWithSeparator,
    pkgName,
    currentTypingMap: toTemplateMap(currentTyping),
    currentTypingTrimmedMap: toTemplateMap(currentTypingTrimmed),
    currentTypingLastTokenMap: toTemplateMap(currentTypingLastToken),
    pkgNameMap: toTemplateMap(pkgName),
  };

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
      currentTyping.slice(0, -1),
    )
      ? assistantMessage.slice(currentTyping.slice(0, -1).length)
      : assistantMessage,
  };

  return Mustache.render(
    settings.templates.suggestionTemplate || "{{assistantMessage}}",
    suggestionContext,
  ).trim();
}
