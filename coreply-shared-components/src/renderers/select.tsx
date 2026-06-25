import { rankWith, schemaMatches, uiTypeIs, and } from "@jsonforms/core";
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

function getStringOptions(schema: Record<string, any>) {
  if (Array.isArray(schema.enum)) {
    return schema.enum.filter((option): option is string => typeof option === "string");
  }

  if (!Array.isArray(schema.anyOf)) {
    return [];
  }

  return schema.anyOf.flatMap((entry: Record<string, any>) => {
    if (!Array.isArray(entry.enum)) {
      return [];
    }

    return entry.enum.filter((option): option is string => typeof option === "string");
  });
}

const SelectControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
}: ControlProps & { label?: string; required?: boolean }) => {
  const options = getStringOptions(schema as Record<string, any>);
  const selectedOption =
    typeof data === "string"
      ? options.find((option) => option === data)
      : undefined;

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
          value={
            selectedOption
              ? { value: selectedOption, label: selectedOption }
              : undefined
          }
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
  20,
  and(
    uiTypeIs("Control"),
    schemaMatches((schema) => getStringOptions(schema as Record<string, any>).length > 0),
  ),
);

export const SelectRenderer = withJsonFormsControlProps(SelectControl);

export const renderers = [{ tester: selectTester, renderer: SelectRenderer }];
