import type { providerDefinitions } from "./index";
import type { CoreplyContext } from "../context";

export async function generateWithCoreplyCloud(
  providerDefinition: typeof providerDefinitions.coreplyCloud,
  settingsByReference: any,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  const settings = providerDefinition.settingsSchema.parse(settingsByReference);
  const response = await fetch(settings.provider.requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.provider.apiKey}`,
      "Accept-Encoding": "identity",
    },
    body: JSON.stringify({
      action: "completion",
      version: 2,
      contexts,
      typing: currentTyping,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json.error ??
        `Coreply Cloud request failed with status ${response.status}`,
    );
  }

  if (typeof json.completion !== "string") {
    throw new Error("Coreply Cloud response missing completion");
  }

  return json.completion.trim();
}
