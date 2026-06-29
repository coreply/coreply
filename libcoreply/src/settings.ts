import { z } from "zod";
import { disableWhenFieldFalse } from "./form-metadata";

export const DEFAULT_SYSTEM_PROMPT =
  "You are an AI texting assistant. You will be given a list of text messages between the user (indicated by 'Message I sent:'), and other people (indicated by their names or simply 'Message I received:'). You may also receive a screenshot of the conversation. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start or end with a certain prefix (both could be parts of a longer word) . The user may quote a specific message. In this case, make sure your suggestions are about the quoted message.\nOutput the suggested text only. Do not output anything else. Do not surround output with quotation marks";

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
            "content": "Chat history:\n{{#pastMessages}}{{#messages}}{{#sent}}Me: {{/sent}}{{#received}}Them: {{/received}}{{content.jsonEscaped}}\n{{/messages}}{{/pastMessages}}{{#currentTyping}}Current typing: {{currentTyping.jsonEscaped}}{{/currentTyping}}{{^currentTyping}}Suggest a reply.{{/currentTyping}}"
        }
    ],
    "max_tokens": 50,
    "stream": false
}`;

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  showErrors: true,
  typingRegexEnabled: false,
  typingRegexPattern: "^.*[\\s.!?,;:]$",
  debounceMs: 350,
  suggestionPresentationType: "both",
};

export function createDefaultGlobalSettings(): GlobalSettings {
  return JSON.parse(JSON.stringify(DEFAULT_GLOBAL_SETTINGS)) as GlobalSettings;
}

export const DEFAULT_FETCH_CONTROL_SETTINGS: FetchControlSettings = {
  typingRegexEnabled: false,
  typingRegexPattern: "^.*[\\s.!?,;:]$",
  debounceMs: 350,
};

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  showErrors: true,
  suggestionPresentationType: "both",
};

export const globalSettingsSchema = z.object({
  showErrors: z
    .boolean()
    .default(true)
    .describe("Whether to show errors in the UI"),
  typingRegexEnabled: z.boolean().default(false),
  typingRegexPattern: z
    .string()
    .default("^.*[\\s.!?,;:]$")
    .meta(disableWhenFieldFalse("typingRegexEnabled")),
  debounceMs: z.number().int().min(0).max(1000).default(350),
  suggestionPresentationType: z
    .enum(["inline", "overlay", "both"])
    .default("both"),
});

export const fetchControlSettingsSchema = globalSettingsSchema.pick({
  typingRegexEnabled: true,
  typingRegexPattern: true,
  debounceMs: true,
});

export const presentationSettingsSchema = globalSettingsSchema.pick({
  showErrors: true,
  suggestionPresentationType: true,
});

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type FetchControlSettings = z.infer<typeof fetchControlSettingsSchema>;
export type PresentationSettings = z.infer<typeof presentationSettingsSchema>;
