import { rankWith, uiTypeIs, schemaTypeIs, and } from "@jsonforms/core";
import { withJsonFormsControlProps, type ControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Text, TextClassContext } from "../components/ui/text";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";

const SelectControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
}: ControlProps & { label?: string; required?: boolean }) => {
  const options = schema.enum || [];

  return (
    <View className="mb-4">
      <TextClassContext.Provider value="font-display">
        {label && (
          <Text className="mb-1 text-sm font-bold">
            {label}
            {required && " *"}
          </Text>
        )}
        <Select
          value={data || ""}
          onValueChange={(value) => handleChange(path, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={label || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} label={option} value={option as any}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TextClassContext.Provider>
    </View>
  );
};

export const selectTester = rankWith(
  11,
  and(
    uiTypeIs("Control"),
    schemaTypeIs("string"),
    (uischema, schema) => schema.enum !== undefined,
  ),
);

export const SelectRenderer = withJsonFormsControlProps(SelectControl);

export const renderers = [{ tester: selectTester, renderer: SelectRenderer }];
