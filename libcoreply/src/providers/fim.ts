import type { ProviderDefinition } from "./index";
import type { TypingInfo } from "../context";

export async function generateWithFIM(
  providerDefinition: ProviderDefinition,
  providerSettings: any,
  generationSettings: any,
  typingInfo: TypingInfo,
): Promise<string> {
  providerDefinition.generationSettingsSchema.parse(generationSettings);
  providerDefinition.providerSettingsSchema.parse(providerSettings);
  let baseURL = providerSettings.baseURL;
  if (!baseURL.endsWith("/")) {
    baseURL += "/";
  }

  const response = await fetch(`${baseURL}completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSettings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: generationSettings.model,
      temperature: generationSettings.temperature,
      top_p: 1.0,
      max_tokens: 100,
      stream: false,
      stop: '")',
      suffix: '")',
      prompt:
        "# Mocking a texting conversation. Messages never repeat. send_message() sends a message. mock_received() means receiving a message from others.\n# Start of Chat History\n" +
        typingInfo.pastMessages.getFIMFormat() +
        '\n# Craft a new text\nsend_message("' +
        typingInfo.currentTyping.replace(/\s+/g, " "),
    }),
  });

  if (!response.ok) {
    throw new Error(`FIM request failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const completionText = json.choices?.[0]?.message?.content ?? "";
  return `${typingInfo.currentTyping.replace(/\s+/g, " ")}${completionText}`.trim();
}
