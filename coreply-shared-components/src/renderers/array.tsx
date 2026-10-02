import { and, composePaths, rankWith, schemaTypeIs, uiTypeIs, type ArrayLayoutProps } from "@jsonforms/core";
import { JsonFormsDispatch, withJsonFormsArrayLayoutProps } from "@jsonforms/react";
import { useMemo } from "react";
import { View } from "react-native";
import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { createSchemaUiSchema } from "./schema-rules";

function ArrayControl({ data: count, schema, arraySchema, path, label, enabled, visible, errors, renderers, cells, addItem, removeItems }: ArrayLayoutProps) {
  const itemUiSchema = useMemo(() => createSchemaUiSchema(schema), [schema]);
  if (!visible) return null;
  const canAdd = enabled && (arraySchema.maxItems === undefined || count < arraySchema.maxItems);
  const canRemove = enabled && (arraySchema.minItems === undefined || count > arraySchema.minItems);

  return (
    <View className="my-3 gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm font-medium">{label}</Text>
        <Button variant="outline" size="sm" disabled={!canAdd} onPress={() => addItem(path, {})()}><Text>Add item</Text></Button>
      </View>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="gap-3 rounded-lg border border-border bg-form p-3">
          <JsonFormsDispatch schema={schema} uischema={itemUiSchema} path={composePaths(path, String(index))} enabled={enabled} renderers={renderers} cells={cells} />
          <Button variant="outline" className="w-full border-destructive" disabled={!canRemove} onPress={removeItems?.(path, [index])} accessibilityLabel={`Remove item ${index + 1}`}><Text className="text-destructive">Remove</Text></Button>
        </View>
      ))}
      {count === 0 ? <Text className="text-sm text-muted-foreground">No items yet.</Text> : null}
      {errors ? <Text className="text-xs text-destructive">{errors}</Text> : null}
    </View>
  );
}

export const renderers = [{
  tester: rankWith(20, and(uiTypeIs("Control"), schemaTypeIs("array"))),
  renderer: withJsonFormsArrayLayoutProps(ArrayControl),
}];
