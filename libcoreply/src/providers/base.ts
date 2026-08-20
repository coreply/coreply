import { generateText } from "ai";
import { buildChatPrompt, buildScreenPrompt } from "./utils";
import type { ProviderDefinition } from "./index";
import type { CoreplyContext } from "../context";

// ** Updated to accept contexts and currentTyping instead of typingInfo
// Constructs prompts from context data using utils functions
export async function generateWithAIProvider(
  providerDefinition: ProviderDefinition,
  settingsByReference: any,
  contexts: CoreplyContext[],
  currentTyping: string,
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

  // Build prompt from contexts using the new format
  let contextPrompt = "";
  for (const context of contexts) {
    if (context.type === "chat") {
      contextPrompt += buildChatPrompt(context.data);
    } else if (context.type === "screen") {
      contextPrompt += buildScreenPrompt(context.data);
    }
  }

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
    providerOptions: settings.providerOptions
      ? JSON.parse(settings.providerOptions)
      : undefined,
  });

  return result.text.trim();
}
