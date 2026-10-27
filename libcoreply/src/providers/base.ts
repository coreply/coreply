import { generateText, type LanguageModel } from "ai";
import Mustache from "mustache";
import type { z } from "zod";
import type { createAISettingsSchema } from "./settings";
import type { CoreplyContext } from "../context";

// ** Updated to accept contexts and currentTyping instead of typingInfo
// Constructs prompts from context data using utils functions
export async function generateStatelessSuggestion(
  model: LanguageModel,
  settings: z.output<ReturnType<typeof createAISettingsSchema>>,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  const { instructions: instructionsTemplate, ...generateTextSettings } =
    settings.generateText;

  const contextPrompt = contexts.map((context) => context.renderPrompt()).join("");
  const instructions = Mustache.render(
    instructionsTemplate,
    {
      profileSystemPrompt: contexts.at(-1)?.profile.appSpecificInstruction,
    },
    undefined,
    {
      escape: (value) => value,
    },
  );

  let userPrompt =
    "Given this chat history\n" +
    contextPrompt +
    "\nIn addition to the message I sent,\nWhat else should I send? Or start a new topic?";
  if (currentTyping.trim()) {
    userPrompt += `The reply should start with '${currentTyping.replace(/\s+/g, " ")}'\n`;
  }

  const result = await generateText({
    model,
    prompt: userPrompt,
    ...generateTextSettings,
    instructions,
    providerOptions: settings.providerOptions
      ? JSON.parse(settings.providerOptions)
      : undefined,
  });

  return result.text.trim();
}
