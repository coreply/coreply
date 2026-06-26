import React, { useEffect, useMemo, useState } from "react";
import {
  Generate,
  type JsonSchema,
  type Rule,
  type UISchemaElement,
} from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "./text";
import type { CoreplyUiRule } from "libcoreply";
import { z, type ZodSchema } from "zod";
import { customRenderers } from "../../renderers";

type JsonSchemaWithCoreplyMeta = JsonSchema & {
  properties?: Record<string, JsonSchemaWithCoreplyMeta>;
  ["x-coreply-rule"]?: CoreplyUiRule;
};

function encodeJsonPointerSegment(value: string) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function decodeJsonPointerSegment(value: string) {
  return value.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolveSchemaFromScope(
  schema: JsonSchemaWithCoreplyMeta,
  scope: string,
) {
  if (scope === "#") {
    return schema;
  }

  const pathSegments = scope
    .replace(/^#\//, "")
    .split("/")
    .filter(Boolean)
    .map(decodeJsonPointerSegment);

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
    ? (current as JsonSchemaWithCoreplyMeta)
    : undefined;
}

function toJsonFormsRule(rule: CoreplyUiRule): Rule | undefined {
  const scope =
    rule.condition.scope ??
    (rule.condition.field
      ? `#/properties/${encodeJsonPointerSegment(rule.condition.field)}`
      : undefined);

  if (!scope) {
    return undefined;
  }

  return {
    effect: rule.effect,
    condition: {
      scope,
      schema: rule.condition.schema,
      ...(rule.condition.failWhenUndefined === undefined
        ? {}
        : { failWhenUndefined: rule.condition.failWhenUndefined }),
    },
  };
}

function applySchemaRules(
  element: UISchemaElement,
  schema: JsonSchemaWithCoreplyMeta,
): UISchemaElement {
  if (element.type === "Control") {
    const propertySchema = resolveSchemaFromScope(schema, element.scope);
    const rule = propertySchema?.["x-coreply-rule"];
    const resolvedRule = rule ? toJsonFormsRule(rule) : undefined;

    if (!resolvedRule || element.rule) {
      return element;
    }

    return { ...element, rule: resolvedRule };
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

function createDefaultUiSchema(schema: JsonSchemaWithCoreplyMeta) {
  const generated = Generate.uiSchema(schema) as UISchemaElement;
  console.log("generated", generated);
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

  // Convert Zod schema to JSON Schema
  const jsonSchema = useMemo(() => {
    return z.toJSONSchema(schema, {
      io: "input",
      target: "openapi-3.0",
    }) as JsonSchemaWithCoreplyMeta;
  }, [schema]);

  console.log("jsonSchema", jsonSchema);

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
      className={className || "p-3 border-border border bg-white rounded-lg"}
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
        onChange={({ data: newData, errors }) => {
          setDraftData(newData);
          if ((errors?.length ?? 0) > 0) {
            return;
          }
          const parsed = schema.safeParse(newData);
          if (parsed.success) {
            onChange(newData);
          }
        }}
        renderers={customRenderers}
        validationMode="ValidateAndShow"
      />
    </View>
  );
}
