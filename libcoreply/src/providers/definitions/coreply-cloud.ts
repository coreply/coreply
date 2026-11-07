import { z } from "zod";
import type { CoreplyContext } from "../../context";
import { CoreplyCloudStatefulInstance } from "../coreply-cloud-stateful";
import { structuredContextProfileSettingsSchema } from "../definition";
import type { ProviderInstanceOptions } from "../instance";
import { StatelessProviderInstance } from "../stateless";

const settingsSchema = z.object({
  provider: z.object({
    apiKey: z.string().describe("Coreply Cloud API key").meta({ feature: "password" }),
    requestUrl: z.httpUrl().describe("Coreply Cloud request URL").meta({ isAdvancedSettings: true }),
  }),
});

export const coreplyCloudProvider = {
  name: "Coreply Cloud",
  stateful: false,
  profileSettingsSchema: structuredContextProfileSettingsSchema,
  settingsSchema,
  settingsDefaults: {
    provider: { requestUrl: "https://coreply.p.nadles.com/completion/" },
  },
  createInstance() {
    return new StatelessProviderInstance((contexts, typing, config) =>
      generateWithCoreplyCloud(settingsSchema.parse(config), contexts, typing),
    );
  },
};

export const coreplyCloudStatefulProvider = {
  name: "Coreply Cloud Preview",
  stateful: true,
  profileSettingsSchema: structuredContextProfileSettingsSchema,
  settingsSchema: z.object({}),
  settingsDefaults: {},
  createInstance(options?: ProviderInstanceOptions) {
    return new CoreplyCloudStatefulInstance(options?.cloudUrl);
  },
};

export async function generateWithCoreplyCloud(
  settings: z.output<typeof settingsSchema>,
  contexts: CoreplyContext[],
  currentTyping: string,
): Promise<string> {
  const response = await fetch(settings.provider.requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.provider.apiKey}`,
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
