import {
  and,
  rankWith,
  schemaTypeIs,
  uiTypeIs,
  type ControlProps,
} from "@jsonforms/core";
import {
  ResolvedJsonFormsDispatch,
  withJsonFormsControlProps,
} from "@jsonforms/react";
import { useMemo } from "react";
import { View } from "react-native";
import { Text } from "../components/ui/text";
import { createSchemaUiSchema } from "./schema-rules";

function hasTextContent(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

const FormControl = ({
  schema,
  rootSchema,
  path,
  label,
  required,
  errors,
  enabled,
  renderers,
  cells,
}: ControlProps) => {
  const nestedUiSchema = useMemo(
    () => createSchemaUiSchema(schema),
    [rootSchema, schema],
  );
  const hasErrors = Boolean(errors);

  return (
    <View className="mb-4 gap-1.5">
      {hasTextContent(label) ? (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium">{label}</Text>
        </View>
      ) : null}
      <View
        className={[
          "rounded-lg border bg-form p-3",
          hasErrors ? "border-destructive" : "border-border",
        ].join(" ")}
      >
        <ResolvedJsonFormsDispatch
          schema={schema}
          uischema={nestedUiSchema}
          path={path}
          enabled={enabled}
          renderers={renderers}
          cells={cells}
        />
      </View>
      {hasTextContent(errors) ? (
        <Text className="text-xs text-destructive font-sans">{errors}</Text>
      ) : hasTextContent(schema.description) ? (
        <Text className="text-xs text-muted-foreground font-sans">
          {schema.description}
        </Text>
      ) : null}
    </View>
  );
};

export const formTester = rankWith(
  15,
  and(uiTypeIs("Control"), schemaTypeIs("object")),
);

export const FormRenderer = withJsonFormsControlProps(FormControl);

export const renderers = [{ tester: formTester, renderer: FormRenderer }];
