import {
  Generate,
  type JsonSchema,
  type UISchemaElement,
} from "@jsonforms/core";
import { z } from "zod";

export const appSettingsSchema = z.object({
  showErrors: z.boolean(),
  typingRegexEnabled: z.boolean(),
  typingRegexPattern: z.string(),
  debounceMs: z.number(),
  suggestionPresentationType: z.number(),
  selectedApps: z.array(z.string()),
});

export type AppSettingsForm = z.infer<typeof appSettingsSchema>;

export function createAppSettingsForm() {
  const schema = z.toJSONSchema(appSettingsSchema) as JsonSchema;
  const uischema = Generate.uiSchema(
    schema,
    "VerticalLayout",
  ) as UISchemaElement;
  return { schema, uischema };
}

export * from "./components/groups";
export * from "./renderers";
