import { rankWith, uiTypeIs, schemaTypeIs, and } from "@jsonforms/core";
import { withJsonFormsControlProps, type ControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "../components/ui/text";
import { Checkbox } from "../components/ui/checkbox";

const CheckboxControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
}: ControlProps & { label?: string; required?: boolean }) => {
  return (
    <View className="mb-4">
      <View className="flex-row items-center">
        <Checkbox
          checked={Boolean(data)}
          onCheckedChange={(checked) => handleChange(path, checked)}
        />
        <Text className="ml-2 text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
          {label}
          {required && " *"}
        </Text>
      </View>
      {schema.description && (
        <Text className="text-xs text-muted-foreground mt-1 ml-6">
          {schema.description}
        </Text>
      )}
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
