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
import { View } from "react-native";
import { Text } from "../components/ui/text";
import { SchemaFields } from "../components/groups/schema-fields";
import { useLingui } from "@lingui/react";

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
  visible,
  renderers,
  cells,
}: ControlProps) => {
  const { i18n } = useLingui();
  const hasErrors = Boolean(errors);
  if (!visible) return null;

  return (
    <View className="my-2 gap-1.5">
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
        <SchemaFields schema={schema}>
          {(nestedUiSchema) => (
            <ResolvedJsonFormsDispatch
              schema={schema}
              uischema={nestedUiSchema}
              path={path}
              enabled={enabled}
              renderers={renderers}
              cells={cells}
            />
          )}
        </SchemaFields>
      </View>
      {hasTextContent(errors) ? (
        <Text className="text-xs text-destructive font-sans">{errors}</Text>
      ) : hasTextContent(schema.description) ? (
        <Text className="text-xs text-muted-foreground font-sans">
          {i18n._(schema.description)}
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
