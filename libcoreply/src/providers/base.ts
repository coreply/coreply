import { generateText, type LanguageModel } from "ai";
import Mustache from "mustache";
import type { ProviderDefinition } from "./index";
import type { CoreplyContext } from "../context";

export type AISDKProviderDefinition = Exclude<
  ProviderDefinition,
  { factoryFunc: null }
>;

// ** Updated to accept contexts and currentTyping instead of typingInfo
// Constructs prompts from context data using utils functions
export async function generateWithAIProvider(
  providerDefinition: AISDKProviderDefinition,
  settingsByReference: unknown,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  const settings = providerDefinition.settingsSchema.parse(settingsByReference);
  const { instructions: instructionsTemplate, ...generateTextSettings } =
    settings.generateText;
  const providerSettings =
    "name" in settings && typeof settings.name === "string"
      ? { ...settings.provider, name: settings.name }
      : settings.provider;

  const createModel = providerDefinition.factoryFunc as (
    settings: typeof providerSettings,
  ) => (modelId: string) => LanguageModel;
  // Registry guarantees each AI provider definition pairs the matching schema and factory.
  const provider = createModel(providerSettings);

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

  const model = provider(settings.model);
  const result = await generateText({
    model: model,
    prompt: userPrompt,
    ...generateTextSettings,
    instructions,
    providerOptions: settings.providerOptions
      ? JSON.parse(settings.providerOptions)
      : undefined,
  });

  return result.text.trim();
}
