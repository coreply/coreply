import { rankWith, uiTypeIs, schemaTypeIs, and } from "@jsonforms/core";
import { withJsonFormsControlProps, type ControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "../components/ui/text";
import { Checkbox } from "../components/ui/checkbox";

function hasTextContent(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

const CheckboxControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
  errors,
  enabled,
}: ControlProps & { label?: string; required?: boolean }) => {
  const hasErrors = Boolean(errors);
  const isEnabled = enabled !== false;

  return (
    <View className="mb-4 gap-1.5">
      <View className="flex-row items-center">
        <Checkbox
          checked={Boolean(data)}
          onCheckedChange={(checked) => {
            if (!isEnabled) {
              return;
            }

            handleChange(path, checked);
          }}
          aria-invalid={hasErrors}
          disabled={!isEnabled}
          className={hasErrors ? "border-destructive" : undefined}
        />
        <Text className="ml-2 text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
          {label}
          {required && " *"}
        </Text>
      </View>
      {hasTextContent(schema.description) ? (
        <Text className="text-xs text-muted-foreground ml-6">
          {schema.description}
        </Text>
      ) : null}
      {hasTextContent(errors) ? (
        <Text className="text-xs text-destructive ml-6">{errors}</Text>
      ) : null}
    </View>
  );
};

export const checkboxTester = rankWith(
  11,
  and(uiTypeIs("Control"), schemaTypeIs("boolean")),
);

export const CheckboxRenderer = withJsonFormsControlProps(CheckboxControl);

export const renderers = [
  { tester: checkboxTester, renderer: CheckboxRenderer },
];
