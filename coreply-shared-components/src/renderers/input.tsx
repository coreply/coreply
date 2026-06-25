import { rankWith, schemaMatches, uiTypeIs, and } from "@jsonforms/core";
import { withJsonFormsControlProps, type ControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "../components/ui/text";
import { Input } from "../components/ui/input";

function hasSelectableOptions(schema: Record<string, any>) {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return true;
  }

  return Array.isArray(schema.anyOf) && schema.anyOf.some((entry: Record<string, any>) => Array.isArray(entry.enum) && entry.enum.length > 0);
}

const InputControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
}: ControlProps & { label?: string; required?: boolean }) => {
  const isNumeric = schema.type === "number" || schema.type === "integer";
  const isInteger = schema.type === "integer";
  const inputType = isNumeric ? "numeric" : "default";

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
          {label}
          {required && " *"}
        </Text>
      )}
      <Input
        value={data === undefined || data === null ? "" : String(data)}
        onChangeText={(value) => {
          if (!isNumeric) {
            handleChange(path, value);
            return;
          }

          if (value === "") {
            handleChange(path, undefined);
            return;
          }

          const nextValue = isInteger ? Number.parseInt(value, 10) : Number(value);
          handleChange(path, Number.isNaN(nextValue) ? undefined : nextValue);
        }}
        className="shadow-none"
        keyboardType={inputType}
        placeholder={schema.description}
      />
    </View>
  );
};

export const inputTester = rankWith(
  10,
  and(
    uiTypeIs("Control"),
    schemaMatches((schema) => !hasSelectableOptions(schema as Record<string, any>)),
  ),
);

export const InputRenderer = withJsonFormsControlProps(InputControl);

export const renderers = [
  { tester: inputTester, renderer: InputRenderer },
];
