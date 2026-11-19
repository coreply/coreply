import { z } from "zod";
import { DEFAULT_SYSTEM_PROMPT } from "../settings";

const baseSettingsSchema = z.object({
  maxOutputTokens: z.int().min(1).max(2000).multipleOf(1).optional()
    .describe(/* i18n */ "Maximum number of tokens to generate in the reply").meta({ isAdvancedSettings: true }),
  temperature: z.number().min(0).max(1).multipleOf(0.1).optional()
    .describe(/* i18n */ "Controls randomness. Lower is more deterministic, higher is more creative").meta({ isAdvancedSettings: true }),
  topP: z.number().min(0).max(1).multipleOf(0.1).optional()
    .describe(/* i18n */ "Nucleus sampling threshold for token selection").meta({ isAdvancedSettings: true }),
  topK: z.number().int().min(1).max(100).multipleOf(1).optional()
    .describe(/* i18n */ "Limits token selection to the top K candidates at each step").meta({ isAdvancedSettings: true }),
  presencePenalty: z.number().min(-1).max(1).multipleOf(0.1).optional()
    .describe(/* i18n */ "Encourages the model to introduce new topics instead of repeating existing ones").meta({ isAdvancedSettings: true }),
  frequencyPenalty: z.number().min(-1).max(1).multipleOf(0.1).optional()
    .describe(/* i18n */ "Reduces repeated tokens and phrases in the generated reply").meta({ isAdvancedSettings: true }),
  maxRetries: z.number().int().min(0).max(3).multipleOf(1).optional()
    .describe(/* i18n */ "Number of times to retry the request on failure").meta({ isAdvancedSettings: true }),
  timeout: z.number().min(0).max(5000).optional()
    .describe(/* i18n */ "Request timeout in milliseconds").meta({ isAdvancedSettings: true }),
  seed: z.number().int().optional()
    .describe(/* i18n */ "Seed for deterministic outputs (optional)").meta({ isAdvancedSettings: true }),
});

export function createProviderOptionsSchema(
  description = /* i18n */ 'Raw JSON object passed directly to AI SDK providerOptions. Include the provider namespace in the object key, for example {"openai": {...}}',
) {
  return z.string().optional().describe(description)
    .meta({ control: "textarea", textareaSize: "s" })
    .refine((value) => {
      if (value === "" || value === undefined) return true;
      try {
        const parsed = JSON.parse(value);
        return !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, { message: "Invalid JSON format or provider options must be a JSON object" })
    .meta({ control: "textarea", textareaSize: "s" });
}

export function createGenerateTextSchema() {
  return z.object({
    instructions: z.string().describe(/* i18n */ "Instructions applied before the chat context")
      .meta({ control: "textarea" }),
    ...baseSettingsSchema.shape,
  });
}

export function createStatefulGenerateTextSchema() {
  return createGenerateTextSchema().extend({
    typingTemplate: z.string()
      .describe(/* i18n */ "Mustache template used to build each current-sentence typing update message")
      .meta({ control: "textarea", textareaSize: "m", isAdvancedSettings: true }),
    contextAppendTemplate: z.string()
      .describe(/* i18n */ "Mustache template used to append new context content and completed-sentence replacements")
      .meta({ control: "textarea", isAdvancedSettings: true }),
  });
}

export function createAISettingsSchema<ProviderSchema extends z.ZodType>(
  provider: ProviderSchema,
  providerOptions: ReturnType<typeof createProviderOptionsSchema>,
) {
  return z.object({
    model: z.string().describe(/* i18n */ "Model ID to use for text generation"),
    provider,
    generateText: createGenerateTextSchema(),
    providerOptions,
  });
}

export function createStatefulSettingsSchema<ProviderSchema extends z.ZodType>(
  providerSchema: ProviderSchema,
  providerOptionsDescription: string,
) {
  return createAISettingsSchema(
    providerSchema,
    createProviderOptionsSchema(providerOptionsDescription),
  ).extend({ generateText: createStatefulGenerateTextSchema() });
}

export const generateTextDefaults = {
  instructions: DEFAULT_SYSTEM_PROMPT,
};

export const DEFAULT_STATEFUL_TYPING_TEMPLATE =
  "Continue the full current sentence starting with exactly:\n{{{currentSentence}}}\n{{#lastTurnUserSent}}The last visible chat turn was sent by the user. Avoid just repeating it.\n{{/lastTurnUserSent}}{{#previousResponseInvalid}}Your previous response was invalid because it did not correctly continue the required prefix or was not longer than the current typing. Fix that now.\n{{/previousResponseInvalid}}Output only the full current sentence text, beginning with the required current prefix.";

export const DEFAULT_STATEFUL_CONTEXT_APPEND_TEMPLATE =
  "{{#renderedContextPrompt}}New context was appended:\n{{{renderedContextPrompt}}}\n{{/renderedContextPrompt}}{{#completedSentencesChanged}}Completed sentences already typed, replacing any previous value:\n<completed-sentences>\n{{{completedSentences}}}\n</completed-sentences>{{/completedSentencesChanged}}";

export const statefulGenerateTextDefaults = {
  ...generateTextDefaults,
  typingTemplate: DEFAULT_STATEFUL_TYPING_TEMPLATE,
  contextAppendTemplate: DEFAULT_STATEFUL_CONTEXT_APPEND_TEMPLATE,
};
