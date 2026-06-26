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
    return schema.enum.filter(
      (option): option is string => typeof option === "string",
    );
  }

  if (!Array.isArray(schema.anyOf)) {
    return [];
  }

  return schema.anyOf.flatMap((entry: Record<string, any>) => {
    if (!Array.isArray(entry.enum)) {
      return [];
    }

    return entry.enum.filter(
      (option): option is string => typeof option === "string",
    );
  });
}

function hasTextContent(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

const SelectControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
  errors,
  enabled,
}: ControlProps & { label?: string; required?: boolean }) => {
  const options = getStringOptions(schema as Record<string, any>);
  const selectedOption =
    typeof data === "string"
      ? options.find((option) => option === data)
      : undefined;
  const hasErrors = Boolean(errors);
  const isEnabled = enabled !== false;

  return (
    <View className="mb-4 gap-1.5">
      <TextClassContext.Provider value="font-display">
        {hasTextContent(label) ? (
          <Text className="text-sm font-bold">
            {label}
            {required && " *"}
          </Text>
        ) : null}
        <Select
          disabled={!isEnabled}
          value={
            selectedOption
              ? { value: selectedOption, label: selectedOption }
              : undefined
          }
          onValueChange={(value) => {
            if (!isEnabled) {
              return;
            }

            handleChange(path, value?.value);
          }}
        >
          <SelectTrigger
            aria-invalid={hasErrors}
            disabled={!isEnabled}
            className={hasErrors ? "border-destructive" : undefined}
          >
            <SelectValue placeholder={label || "Select an option"} />
          </SelectTrigger>
          <SelectContent side="top">
            {options.map((option) => (
              <SelectItem key={option} label={option} value={option as any}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasTextContent(schema.description) ? (
          <Text className="text-xs text-muted-foreground">
            {schema.description}
          </Text>
        ) : null}
        {hasTextContent(errors) ? (
          <Text className="text-xs text-destructive">{errors}</Text>
        ) : null}
      </TextClassContext.Provider>
    </View>
  );
};

export const selectTester = rankWith(
  20,
  and(
    uiTypeIs("Control"),
    schemaMatches(
      (schema) => getStringOptions(schema as Record<string, any>).length > 0,
    ),
  ),
);

export const SelectRenderer = withJsonFormsControlProps(SelectControl);

export const renderers = [{ tester: selectTester, renderer: SelectRenderer }];
