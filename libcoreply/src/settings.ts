import { z } from "zod";

export const DEFAULT_SYSTEM_PROMPT =
  "You are an AI texting assistant. You will be given a list of text messages between the user and other people. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start with a certain prefix (could be part of a longer word). Make sure your output is LONGER than the user requested prefix and what the user is typing.\nOutput the suggested text only. Do not output anything else. Do not surround output with quotation marks";

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
    "max_tokens": 50,
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
  fetchControl: z.object({
    typingRegexEnabled: z.boolean().default(false),
    typingRegexPattern: z.string().default("^.*[\\s.!?,;:]$").meta({
      disabledWhenFieldFalse: "typingRegexEnabled",
    }),
    debounceMs: z.number().int().min(0).max(1000).default(350),
  }),
  presentation: z.object({
    showErrors: z
      .boolean()
      .default(true)
      .describe("Whether to show errors in the UI"),
    suggestionPresentationType: z
      .enum(["inline", "overlay", "both"])
      .default("both"),
  }),
});

export const fetchControlSettingsSchema =
  globalSettingsSchema.shape.fetchControl;

export const presentationSettingsSchema =
  globalSettingsSchema.shape.presentation;

export const coreplySettingsSchema = z.object({
  globalSettings: globalSettingsSchema,
  providerId: z.string(),
  providerConfig: z.record(z.string(), z.unknown()),
  selectedApps: z.array(z.string()).default([]),
});

export type CoreplySettings = z.infer<typeof coreplySettingsSchema>;

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type FetchControlSettings = z.infer<typeof fetchControlSettingsSchema>;
export type PresentationSettings = z.infer<typeof presentationSettingsSchema>;
