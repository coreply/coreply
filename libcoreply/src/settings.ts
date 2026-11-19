import { z } from "zod";
import { profileSchema } from "./profile/schema";

export const DEFAULT_SYSTEM_PROMPT =
  "You are an AI texting assistant. You will be given a list of text messages between the user and other people. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start with a certain prefix (could be part of a longer word). Make sure your output is LONGER than the user requested prefix and what the user is typing.\n{{#profileSystemPrompt}}\nAdditional app-specific instructions:\n{{{profileSystemPrompt}}}\n{{/profileSystemPrompt}}Output the suggested text only. Do not output anything else. Do not surround output with quotation marks";

export const DEFAULT_ADVANCED_BODY = `{
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "top_p": 1.0,
    "messages": [
        {
            "role": "system",
            "content": "You are an AI texting assistant. Generate a suggested reply based on the conversation history and current typing. Output only the suggested text without quotation marks or extra formatting."
        },
        {
            "role": "user",
            "content": "Contexts:\n{{{contextsJson}}}\n{{#currentTyping}}Current typing: {{jsonEscaped}}{{/currentTyping}}{{^currentTyping}}Suggest a reply.{{/currentTyping}}"
        }
    ],
    "stream": false
}`;

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  fetchControl: {
    typingRegexEnabled: false,
    typingRegexPattern: "^.*[\\s.!?,;:]$",
    debounceMs: 350,
  },
  presentation: {
    showErrors: true,
    suggestionPresentationType: "both",
  },
  troubleshooting: {
    saveLogs: false,
  },
};

export function createDefaultGlobalSettings(): GlobalSettings {
  return JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SETTINGS)) as GlobalSettings;
}

export const DEFAULT_FETCH_CONTROL_SETTINGS: FetchControlSettings = {
  ...DEFAULT_GLOBAL_SETTINGS.fetchControl,
};

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  ...DEFAULT_GLOBAL_SETTINGS.presentation,
};

export const globalSettingsSchema = z.object({
  presentation: z.object({
    showErrors: z
      .boolean()
      .default(true)
      .describe(/* i18n */ "Whether to show errors in the UI"),
    suggestionPresentationType: z
      .enum(["inline", "overlay", "both"])
      .default("both")
      .describe(/* i18n */ "Choose where suggestions appear")
      .meta({
        control: "advanced-select",
        optionSubtitles: {
          inline: /* i18n */ "Show suggestions in the text field.",
          overlay: /* i18n */ "Show suggestions in a separate overlay.",
          both: /* i18n */ "Show suggestions in the text field and overlay.",
        },
      }),
  }),
  fetchControl: z.object({
    typingRegexEnabled: z.boolean().default(false)
      .describe(/* i18n */ "Only suggest when your typing matches the pattern below"),
    typingRegexPattern: z.string().default("^.*[\\s.!?,;:]$").meta({
      disabledWhenFieldFalse: "typingRegexEnabled",
    }).describe(/* i18n */ "Suggestions are only requested when your typing matches this pattern"),
    debounceMs: z.number().int().min(0).max(1000).default(350)
      .describe(/* i18n */ "How long to wait after typing before requesting another suggestion, in milliseconds"),
  }).meta({ isAdvancedSettings: true }),
  troubleshooting: z.object({
    saveLogs: z
      .boolean()
      .default(false)
      .describe(/* i18n */ "Save the 10 most recent suggestion requests on this device. Turning this off deletes saved logs."),
  }).prefault({}).meta({ isAdvancedSettings: true }),
});

export const fetchControlSettingsSchema =
  globalSettingsSchema.shape.fetchControl;

export const presentationSettingsSchema =
  globalSettingsSchema.shape.presentation;

export const coreplySettingsSchema = z.object({
  globalSettings: globalSettingsSchema,
  providerId: z.string(),
  providerConfigs: z.record(z.string(), z.record(z.string(), z.unknown())),
  selectedApps: z.array(z.string()).default([]),
  profiles: z.array(profileSchema),
});

export type CoreplySettings = z.infer<typeof coreplySettingsSchema>;

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type FetchControlSettings = z.infer<typeof fetchControlSettingsSchema>;
export type PresentationSettings = z.infer<typeof presentationSettingsSchema>;
