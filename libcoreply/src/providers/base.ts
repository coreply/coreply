import { generateText } from "ai";
import type { ProviderDefinition } from "./index";
import type { TypingInfo } from "../context";

export async function generateWithAIProvider(
  providerDefinition: ProviderDefinition,
  settingsByReference: any,
  typingInfo: TypingInfo,
): Promise<string> {
  if (!providerDefinition.factoryFunc) {
    throw new Error("Provider does not have a factory function.");
  }

  const settings = providerDefinition.settingsSchema.parse(
    settingsByReference,
  ) as any;
  const generateTextSettings = { ...settings.generateText };
  const providerSettings =
    typeof settings.name === "string"
      ? { ...settings.provider, name: settings.name }
      : settings.provider;

  const provider = providerDefinition.factoryFunc(providerSettings);

  let userPrompt =
    "Given this chat history\n" +
    typingInfo.pastMessages.getCoreply2Format() +
    "\nIn addition to the message I sent,\nWhat else should I send? Or start a new topic?";
  if (typingInfo.currentTyping.trim()) {
    userPrompt += `The reply should start with '${typingInfo.currentTyping.replace(/\s+/g, " ")}'\n`;
  }
  const model = provider(settings.model);
  const result = await generateText({
    model: model,
    prompt: userPrompt,
    ...generateTextSettings,
    providerOptions: settings.providerOptions
      ? JSON.parse(settings.providerOptions)
      : undefined,
  });

  return result.text.trim();
}
