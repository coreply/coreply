import { generateText } from "ai";
import type { ProviderDefinition } from "./index";
import type { TypingInfo } from "../context";

function parseProviderOptions(providerOptions: string | undefined) {
  if (!providerOptions) {
    return undefined;
  }

  return JSON.parse(providerOptions);
}

export async function generateWithAIProvider(
  providerDefinition: ProviderDefinition,
  providerSettings: any,
  generationSettings: any,
  typingInfo: TypingInfo,
): Promise<string> {
  if (!providerDefinition.factoryFunc) {
    throw new Error("Provider does not have a factory function.");
  }

  const provider = providerDefinition.factoryFunc(providerSettings);

  let userPrompt =
    "Given this chat history\n" +
    typingInfo.pastMessages.getCoreply2Format() +
    "\nIn addition to the message I sent,\nWhat else should I send? Or start a new topic?";
  if (typingInfo.currentTyping.trim()) {
    userPrompt += `The reply should start with '${typingInfo.currentTyping.replace(/\s+/g, " ")}'\n`;
  }
  const model = provider(generationSettings.model);
  const providerOptions = parseProviderOptions(generationSettings.providerOptions);
  delete generationSettings.model;
  delete generationSettings.providerOptions;
  const result = await generateText({
    model: model,
    ...generationSettings,
    providerOptions,
  });

  return result.text.trim();
}
