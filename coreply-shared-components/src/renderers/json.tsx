import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";

function JsonControl({ data, label, path, handleChange, errors, schema, enabled, visible }: ControlProps) {
  if (!visible) return null;
  return (
    <View className="mb-4 gap-1.5">
      <Text className="text-sm font-medium">{label}</Text>
      <Input value={typeof data === "string" ? data : data === undefined ? "" : JSON.stringify(data)} editable={enabled} onChangeText={(text) => {
        try {
          const value: unknown = JSON.parse(text);
          handleChange(path, value);
        } catch {
          handleChange(path, text);
        }
      }} />
      {schema.description ? <Text className="text-xs text-muted-foreground">{schema.description}</Text> : null}
      {errors ? <Text className="text-xs text-destructive">{errors}</Text> : null}
    </View>
  );
}

export const renderers = [{
  tester: rankWith(25, and(uiTypeIs("Control"), schemaMatches((schema) => "control" in schema && schema.control === "json"))),
  renderer: withJsonFormsControlProps(JsonControl),
}];
