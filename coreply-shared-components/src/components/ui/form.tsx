import { useEffect, useMemo, useState } from "react";
import {
  Generate,
  RuleEffect,
  type JsonSchema,
  type UISchemaElement,
  decode,
  type ControlElement,
} from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "./text";
import { z, type ZodSchema } from "zod";
import { customRenderers } from "../../renderers";
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
        return { message: "value cannot be empty" };
      }

      return undefined;
    },
  });
}

function resolveSchemaFromScope(
  schema: JsonSchema,
  scope: string,
): (JsonSchema & { disabledWhenFieldFalse?: string }) | undefined {
  if (scope === "#") {
    return schema;
  }

  const pathSegments = scope
    .replace(/^#\//, "")
    .split("/")
    .filter(Boolean)
    .map(decode);

  let current: unknown = schema;
  for (const segment of pathSegments) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(segment in current)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "object" && current !== null
    ? (current as JsonSchema & { disabledWhenFieldFalse?: string })
    : undefined;
}

function applySchemaRules(
  element: UISchemaElement,
  schema: JsonSchema,
): UISchemaElement {
  if (element.type === "Control") {
    const controlElement = element as ControlElement;
    const propertySchema = resolveSchemaFromScope(schema, controlElement.scope);
    const rule = propertySchema?.disabledWhenFieldFalse;
    if (rule) {
      return {
        ...element,
        rule: {
          effect: RuleEffect.DISABLE,
          condition: {
            scope: `#/properties/${rule}`,
            validate: (context) => {
              return !(context.fullData as Record<string, any>)[rule];
            },
          },
        },
      };
    }
    return element;
  }

  if ("elements" in element && Array.isArray(element.elements)) {
    return {
      ...element,
      elements: element.elements.map((child) =>
        applySchemaRules(child, schema),
      ),
    };
  }

  return element;
}

function createDefaultUiSchema(schema: JsonSchema) {
  const generated = Generate.uiSchema(schema);
  return applySchemaRules(generated, schema);
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
    if (uiSchema) {
      return applySchemaRules(uiSchema, jsonSchema);
    }

    return createDefaultUiSchema(jsonSchema);
  }, [jsonSchema, uiSchema]);

  useEffect(() => {
    setDraftData(data);
  }, [data]);

  return (
    <View
      className={className || "p-3 border-border border bg-form rounded-lg"}
    >
      {title && (
        <Text
          className="mb-3 text-base"
          style={{ fontFamily: "Outfit_500Medium" }}
        >
          {title}
        </Text>
      )}
      <JsonForms
        schema={jsonSchema}
        uischema={resolvedUiSchema}
        data={draftData}
        onChange={debounce(({ data: newData }) => {
          setDraftData(newData);
          onChange(newData);
        }, 200)}
        renderers={customRenderers}
        additionalErrors={additionalErrors}
        validationMode="NoValidation"
      />
    </View>
  );
}
