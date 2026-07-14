import { useEffect, useMemo, useState } from "react";
import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "./text";
import { z, type ZodSchema } from "zod";
import { customRenderers } from "../../renderers";
import { createSchemaUiSchema } from "../../renderers/schema-rules";
import debounce from "debounce";

function safeParseWithCustomStringErrors<T extends Record<string, any>>(
  schema: ZodSchema<T>,
  data: unknown,
) {
  return schema.safeParse(data, {
    error: (issue) => {
      if (
        issue.code === "invalid_type" &&
        issue.expected === "string" &&
        issue.input === undefined
      ) {
        return { message: "This field is required" };
      }

      return undefined;
    },
  });
}

interface SchemaFormProps<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  uiSchema?: UISchemaElement;
  data: T;
  onChange: (data: T) => void;
  title?: string;
  className?: string;
}

export function SchemaForm<T extends Record<string, any>>({
  schema,
  uiSchema,
  data,
  onChange,
  title,
  className,
}: SchemaFormProps<T>) {
  const [draftData, setDraftData] = useState<T>(data);

  const additionalErrors = useMemo(() => {
    const parsed = safeParseWithCustomStringErrors(schema, draftData);
    if (parsed.success) {
      return [];
    }

    return parsed.error.issues.map((issue) => ({
      instancePath:
        issue.path.length > 0
          ? `/${issue.path
              .map((segment) =>
                String(segment).replaceAll("~", "~0").replaceAll("/", "~1"),
              )
              .join("/")}`
          : "",
      message: issue.message,
      schemaPath: "",
      keyword: issue.code,
      params: {},
    }));
  }, [draftData, schema]);

  // Convert Zod schema to JSON Schema
  const jsonSchema = useMemo(() => {
    return z.toJSONSchema(schema, {
      io: "input",
      target: "openapi-3.0",
    }) as JsonSchema;
  }, [schema]);

  const resolvedUiSchema = useMemo(() => {
    return createSchemaUiSchema(jsonSchema);
  }, [jsonSchema]);

  useEffect(() => {
    setDraftData(data);
  }, [data]);

  return (
    <View className={className || ""}>
      {title && <Text className="mb-3 text-base font-medium">{title}</Text>}
      <JsonForms
        schema={jsonSchema}
        uischema={resolvedUiSchema}
        data={draftData}
        onChange={debounce(({ data: newData }) => {
          setDraftData(newData);
          onChange(newData);
        }, 1000)}
        renderers={customRenderers}
        additionalErrors={additionalErrors}
        validationMode="NoValidation"
      />
    </View>
  );
}
