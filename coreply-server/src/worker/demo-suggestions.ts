import { Hono } from "hono";
import { z } from "zod";
import { createProviderInstance, deserializeContext, generateGenericProfile, providerDefinitions } from "libcoreply";
import { setupI18n } from "@lingui/core";
import { createDemoConversation } from "coreply-shared-components/src/demo-conversations/localized";
import { messages as en } from "../react-app/i18n/en";
import { messages as de } from "../react-app/i18n/de";
import { messages as es } from "../react-app/i18n/es";
import { messages as fr } from "../react-app/i18n/fr";
import { messages as sv } from "../react-app/i18n/sv";
import { messages as zhHK } from "../react-app/i18n/zh-HK";
import { messages as zhTW } from "../react-app/i18n/zh-TW";

const catalogs = { en, de, es, fr, sv, "zh-HK": zhHK, "zh-TW": zhTW };

const inputSchema = z.object({
  conversationId: z.enum(["dinner", "workspace", "dating", "coding", "onboarding"]),
  typing: z.string().max(2000),
  locale: z.enum(["en", "de", "es", "fr", "sv", "zh-HK", "zh-TW"]),
});

const settingsSchema = z.object({
  providerId: z.enum(["openaiStateful", "openaiCompatibleStateful", "openrouterStateful", "azureStateful", "xaiStateful", "mistralStateful", "groqStateful", "googleStateful", "googleVertexStateful", "minimaxStateful"]),
  providerConfig: z.record(z.string(), z.unknown()),
});

export const demoSuggestions = new Hono<{ Bindings: Env }>();

demoSuggestions.post("/", async (c) => {
  const input = inputSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid demo conversation or draft." }, 400);

  try {
    const cloudSettings = JSON.parse(c.env.COREPLY_CLOUD_SETTINGS);
    cloudSettings.providerConfig.generateText.instructions = c.env.COREPLY_CLOUD_INSTRUCTIONS;
    const config = settingsSchema.parse(cloudSettings);
    const settings = providerDefinitions[config.providerId].settingsSchema.parse(config.providerConfig);
    const locale = input.data.locale;
    const i18n = setupI18n({ locale, messages: { [locale]: catalogs[locale] } });
    const conversation = createDemoConversation(input.data.conversationId, i18n, {});
    const profile = generateGenericProfile("demo", "Demo");
    const context = deserializeContext({
      type: "chat",
      data: {
        title: conversation.title,
        turns: conversation.messages.filter((message) => message.text && (input.data.conversationId !== "onboarding" || message.id === "welcome" || message.id === "welcome-tip")).map((message) => ({
          userSent: message.outgoing,
          messages: [{ body: message.text }],
        })),
      },
    }, profile);
    const completion = await createProviderInstance(config.providerId).request([context], input.data.typing, settings);
    return c.json({ suggestion: completion.slice(input.data.typing.length) });
  } catch (error) {
    console.error("Demo suggestion failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return c.json({ error: "Couldn't generate a suggestion." }, 500);
  }
});
