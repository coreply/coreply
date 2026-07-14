import {
  Generate,
  RuleEffect,
  decode,
  type ControlElement,
  type JsonSchema,
  type UISchemaElement,
} from "@jsonforms/core";

function resolveSchemaFromScope(
  schema: JsonSchema,
  scope: string,
):
  | (JsonSchema & { disabledWhenFieldFalse?: string; show?: boolean })
  | undefined {
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
    ? (current as JsonSchema & {
        disabledWhenFieldFalse?: string;
        show?: boolean;
      })
    : undefined;
}

export function applySchemaRules(
  element: UISchemaElement,
  schema: JsonSchema,
): UISchemaElement {
  if (element.type === "Control") {
    const controlElement = element as ControlElement;
    const propertySchema = resolveSchemaFromScope(schema, controlElement.scope);
    if (propertySchema?.show === false) {
      return {
        ...element,
        rule: {
          effect: RuleEffect.HIDE,
          condition: {
            scope: "#",
            validate: () => true,
          },
        },
      };
    }

    const rule = propertySchema?.disabledWhenFieldFalse;
    if (rule) {
      return {
        ...element,
        rule: {
          effect: RuleEffect.DISABLE,
          condition: {
            scope: `#/properties/${rule}`,
            validate: (context) => {
              console.log(context);
              return context.data === false;
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

export function createSchemaUiSchema(schema: JsonSchema) {
  return applySchemaRules(Generate.uiSchema(schema), schema);
}
