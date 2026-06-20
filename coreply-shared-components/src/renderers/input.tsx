import { rankWith, uiTypeIs, schemaTypeIs, and } from "@jsonforms/core";
import { withJsonFormsControlProps, type ControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "../components/ui/text";
import { Input } from "../components/ui/input";

const InputControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
}: ControlProps & { label?: string; required?: boolean }) => {
  const inputType = schema.type === "number" ? "numeric" : "default";

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
          {label}
          {required && " *"}
        </Text>
      )}
      <Input
        value={data || ""}
        onChangeText={(value) =>
          handleChange(path, inputType === "number" ? Number(value) : value)
        }
        className="shadow-none"
        keyboardType={inputType}
        placeholder={schema.description}
      />
    </View>
  );
};

export const inputTester = rankWith(10, and(uiTypeIs("Control")));

export const numberInputTester = rankWith(
  10,
  and(uiTypeIs("Control"), schemaTypeIs("number")),
);

export const InputRenderer = withJsonFormsControlProps(InputControl);

export const renderers = [
  { tester: inputTester, renderer: InputRenderer },
  { tester: numberInputTester, renderer: InputRenderer },
];
