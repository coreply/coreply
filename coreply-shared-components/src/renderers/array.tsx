import { and, composePaths, rankWith, schemaTypeIs, uiTypeIs, update, type ArrayLayoutProps } from "@jsonforms/core";
import { JsonFormsDispatch, useJsonForms, withJsonFormsArrayLayoutProps } from "@jsonforms/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { View } from "react-native";
import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { SchemaFields } from "../components/groups/schema-fields";

function ArrayControl({ data: count, schema, arraySchema, path, label, enabled, visible, errors, renderers, cells, removeItems }: ArrayLayoutProps) {
  const { t } = useLingui();
  const { dispatch } = useJsonForms();
  if (!visible) return null;
  const canAdd = enabled && (arraySchema.maxItems === undefined || count < arraySchema.maxItems);
  const canRemove = enabled && (arraySchema.minItems === undefined || count > arraySchema.minItems);
  const prependItem = () => {
    const item = {};
    dispatch?.(update(path, (array) => {
      if (array === undefined || array === null) return [item];
      return [item, ...array];
    }, { type: "ADD", values: [item] }));
  };

  return (
    <View className="my-3 gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm font-medium">{label}</Text>
        <Button variant="outline" size="sm" disabled={!canAdd} onPress={prependItem}><Text><Trans comment="Adds an item to a settings list">Add item</Trans></Text></Button>
      </View>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="gap-3 rounded-lg border border-border bg-form p-3">
          <SchemaFields schema={schema}>
            {(itemUiSchema) => <JsonFormsDispatch schema={schema} uischema={itemUiSchema} path={composePaths(path, String(index))} enabled={enabled} renderers={renderers} cells={cells} />}
          </SchemaFields>
          <Button variant="outline" className="w-full border-destructive" disabled={!canRemove} onPress={removeItems?.(path, [index])} accessibilityLabel={t`Remove item ${index + 1}`}><Text className="text-destructive"><Trans comment="Removes an item from a settings list">Remove</Trans></Text></Button>
        </View>
      ))}
      {count === 0 ? <Text className="text-sm text-muted-foreground"><Trans>No items yet.</Trans></Text> : null}
      {errors ? <Text className="text-xs text-destructive">{errors}</Text> : null}
    </View>
  );
}

export const renderers = [{
  tester: rankWith(20, and(uiTypeIs("Control"), schemaTypeIs("array"))),
  renderer: withJsonFormsArrayLayoutProps(ArrayControl),
}];
