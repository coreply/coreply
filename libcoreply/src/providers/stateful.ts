import type { LanguageModel, ModelMessage } from "ai";
import { generateText } from "ai";
import { deepEqual } from "fast-equals";
import Mustache from "mustache";
import type { z } from "zod";

import { deserializeContext, type CoreplyContext } from "../context";
import { ChatContextImpl, type ChatContextData, type ChatTurn } from "../context/chat";
import type { ProviderInstance } from "./instance";
import type { createStatefulSettingsSchema } from "./index";

// Hermes (React Native) lacks Intl.Segmenter; create it only when segmentation
// actually runs, so importing this module stays safe.
let sentenceSegmenter: Intl.Segmenter | undefined;

function getSentenceSegmenter(): Intl.Segmenter {
  return (sentenceSegmenter ??= new Intl.Segmenter(undefined, { granularity: "sentence" }));
}

function getStrictChatAppend(
  previousData: ChatContextData,
  nextData: ChatContextData,
): ChatContextData | null {
  if (previousData.id !== nextData.id || previousData.title !== nextData.title) {
    return null;
  }

  if (nextData.turns.length < previousData.turns.length) {
    return null;
  }

  if (previousData.turns.length === 0) {
    if (nextData.turns.some((turn) => turn.messages.length === 0)) {
      return null;
    }

    return {
      id: nextData.id,
      title: nextData.title,
      turns: nextData.turns,
    };
  }

  if (
    !deepEqual(
      previousData.turns.slice(0, -1),
      nextData.turns.slice(0, previousData.turns.length - 1),
    )
  ) {
    return null;
  }

  const previousLastTurn = previousData.turns.at(-1);
  const nextLastMatchingTurn = nextData.turns[previousData.turns.length - 1];

  if (!previousLastTurn || !nextLastMatchingTurn) {
    return null;
  }

  if (
    previousLastTurn.sender !== nextLastMatchingTurn.sender ||
    previousLastTurn.userSent !== nextLastMatchingTurn.userSent ||
    nextLastMatchingTurn.messages.length < previousLastTurn.messages.length ||
    !deepEqual(
      previousLastTurn.messages,
      nextLastMatchingTurn.messages.slice(0, previousLastTurn.messages.length),
    )
  ) {
    return null;
  }

  const appendedTurns: ChatTurn[] = [];
  const appendedMessagesInLastTurn = nextLastMatchingTurn.messages.slice(
    previousLastTurn.messages.length,
  );

  if (appendedMessagesInLastTurn.length > 0) {
    appendedTurns.push({
      sender: nextLastMatchingTurn.sender,
      userSent: nextLastMatchingTurn.userSent,
      messages: appendedMessagesInLastTurn,
    });
  }

  const additionalTurns = nextData.turns.slice(previousData.turns.length);
  if (additionalTurns.some((turn) => turn.messages.length === 0)) {
    return null;
  }

  appendedTurns.push(...additionalTurns);

  return {
    id: nextData.id,
    title: nextData.title,
    turns: appendedTurns,
  };
}

function buildTypingTemplateView(
  activeContext: CoreplyContext | undefined,
  typing: string,
) {
  const segments = [...getSentenceSegmenter().segment(typing)].map((segment) => segment.segment);
  const lastTurn = activeContext?.type === "chat" ? activeContext.data.turns.at(-1) : undefined;

  return {
    typing,
    completedSentences: segments.slice(0, -1).join(""),
    currentSentence: segments.slice(-1).join(""),
    lastTurnUserSent: lastTurn?.userSent === true,
  };
}

function validateSuggestion(
  view: ReturnType<typeof buildTypingTemplateView>,
  output: string,
) {
  if (output.startsWith(view.typing) && output.length > view.typing.length) {
    return output;
  }

  if (!output.startsWith(view.currentSentence)) {
    return null;
  }

  const reconstructed = `${view.completedSentences}${output}`;
  if (reconstructed.length <= view.typing.length) {
    return null;
  }

  return reconstructed;
}

function buildAppendedContextPrompt(
  incomingContext: CoreplyContext,
  appendData: ChatContextData,
) {
  const appendedContext = new ChatContextImpl(
    incomingContext.profile,
    appendData,
    incomingContext.label,
    incomingContext,
  );

  return appendedContext.renderPrompt();
}

function compareContexts(
  previousContexts: CoreplyContext[] | null,
  incomingContexts: CoreplyContext[],
) {
  if (
    !previousContexts ||
    previousContexts.length !== incomingContexts.length
  ) {
    return { reset: true };
  }

  let appendPrompt = "";

  for (const [index, incomingContext] of incomingContexts.entries()) {
    const previousContext = previousContexts[index];
    if (
      previousContext.profile.id !== incomingContext.profile.id ||
      previousContext.profile.appSpecificInstruction !== incomingContext.profile.appSpecificInstruction ||
      previousContext.contextTemplate !== incomingContext.contextTemplate ||
      previousContext.contextTemplatePartial !== incomingContext.contextTemplatePartial ||
      previousContext.type !== incomingContext.type
    ) {
      return { reset: true };
    }

    if (deepEqual(previousContext.data, incomingContext.data)) {
      continue;
    }

    if (
      previousContext.type !== "chat" ||
      incomingContext.type !== "chat"
    ) {
      return { reset: true };
    }

    const appendData = getStrictChatAppend(
      previousContext.data,
      incomingContext.data,
    );
    if (!appendData) {
      return { reset: true };
    }

    if (appendData.turns.length > 0) {
      appendPrompt += buildAppendedContextPrompt(
        incomingContext,
        appendData,
      );
    }
  }

  return { reset: false, appendPrompt };
}

export class StatefulAIProviderInstance<
  Settings extends z.output<ReturnType<typeof createStatefulSettingsSchema>>,
> implements ProviderInstance {
  private previousContexts: CoreplyContext[] | null = null;
  private previousCompletedSentences: string | null = null;
  private responseMessages: ModelMessage[] = [];
  private readonly settingsSchema: z.ZodType<Settings>;
  private readonly createModel: (settings: Settings) => LanguageModel;

  constructor(
    settingsSchema: z.ZodType<Settings>,
    createModel: (settings: Settings) => LanguageModel,
  ) {
    this.settingsSchema = settingsSchema;
    this.createModel = createModel;
  }

  async request(
    contexts: CoreplyContext[],
    currentTyping: string,
    providerConfig: Record<string, unknown>,
  ): Promise<string> {
    const incomingContexts = contexts.map((context) => {
      const clone = deserializeContext(
        structuredClone(context.toJSON()),
        structuredClone(context.profile),
        context,
      );
      clone.label = context.label;
      return clone;
    });
    const activeContext = incomingContexts.at(-1);
    const settings = this.settingsSchema.parse(providerConfig);
    const {
      instructions: instructionsTemplate,
      typingTemplate,
      contextAppendTemplate,
      ...generateTextSettings
    } = settings.generateText;

    const decision = compareContexts(
      this.previousContexts,
      incomingContexts,
    );

    const typingView = buildTypingTemplateView(activeContext, currentTyping);
    const completedSentencesChanged = decision.reset ||
      typingView.completedSentences !== this.previousCompletedSentences;

    const instructions = Mustache.render(
      instructionsTemplate,
      {
        profileSystemPrompt: activeContext?.profile.appSpecificInstruction,
      },
      undefined,
      {
        escape: (value) => value,
      },
    );

    let messages: ModelMessage[] = decision.reset ? [] : [...this.responseMessages];
    const renderedContextPrompt = decision.reset
      ? contexts.map((context) => context.renderPrompt()).join("")
      : decision.appendPrompt;
    const appendPrompt = completedSentencesChanged || (!decision.reset && renderedContextPrompt)
      ? Mustache.render(
        contextAppendTemplate,
        {
          renderedContextPrompt: decision.reset ? "" : renderedContextPrompt,
          completedSentencesChanged,
          completedSentences: typingView.completedSentences,
        },
        undefined,
        {
          escape: (value) => value,
        },
      )
      : "";
    const contextPrompt = [decision.reset ? renderedContextPrompt : "", appendPrompt]
      .filter((prompt) => prompt !== undefined && prompt !== "")
      .join("\n");

    const model = this.createModel(settings);
    const providerOptions = settings.providerOptions
      ? JSON.parse(settings.providerOptions)
      : undefined;
    let suggestion: string | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const renderedTypingPrompt = Mustache.render(
        typingTemplate,
        {
          currentSentence: typingView.currentSentence,
          lastTurnUserSent: typingView.lastTurnUserSent,
          previousResponseInvalid: attempt > 0,
        },
        undefined,
        {
          escape: (value) => value,
        },
      );

      const requestMessages = [
        ...messages,
        {
          role: "user",
          content: [{
            type: "text",
            text: [attempt === 0 ? contextPrompt : "", renderedTypingPrompt]
              .filter((prompt) => prompt !== undefined && prompt !== "")
              .join("\n"),
          }],
        } satisfies ModelMessage,
      ];

      const result = await generateText({
        model,
        instructions,
        messages: requestMessages,
        ...generateTextSettings,
        providerOptions,
      });

      messages = [...requestMessages, ...result.responseMessages];
      suggestion = validateSuggestion(typingView, result.text);
      if (suggestion !== null) {
        break;
      }
    }

    this.previousContexts = incomingContexts;
    this.previousCompletedSentences = typingView.completedSentences;
    this.responseMessages = messages;

    return suggestion ?? "";
  }
}
