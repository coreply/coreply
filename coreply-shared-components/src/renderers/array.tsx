import { and, composePaths, rankWith, schemaTypeIs, uiTypeIs, update, type ArrayLayoutProps } from "@jsonforms/core";
import { JsonFormsDispatch, useJsonForms, withJsonFormsArrayLayoutProps } from "@jsonforms/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Plus, Trash2 } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "../components/ui/button";
import { Icon } from "../components/ui/icon";
import { Text } from "../components/ui/text";
import { SchemaFields } from "../components/groups/schema-fields";

function ArrayControl({ data: count, schema, arraySchema, path, label, enabled, visible, renderers, cells, removeItems }: ArrayLayoutProps) {
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
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm font-medium">{label}</Text>
        <Button variant="outline" size="sm" disabled={!canAdd} onPress={prependItem}><Icon as={Plus} className="size-4" /><Text><Trans comment="Adds an item to a settings list">Add item</Trans></Text></Button>
      </View>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="gap-3 rounded-lg border border-border bg-form p-3">
          <SchemaFields schema={schema}>
            {(itemUiSchema) => <JsonFormsDispatch schema={schema} uischema={itemUiSchema} path={composePaths(path, String(index))} enabled={enabled} renderers={renderers} cells={cells} />}
          </SchemaFields>
          <Button variant="outline" className="w-full border-destructive" disabled={!canRemove} onPress={removeItems?.(path, [index])} accessibilityLabel={t`Remove item ${index + 1}`}><Icon as={Trash2} className="size-4 text-destructive" /><Text className="text-destructive"><Trans comment="Removes an item from a settings list">Remove</Trans></Text></Button>
        </View>
      ))}
      {count === 0 ? <Text className="text-sm text-muted-foreground"><Trans>No items yet.</Trans></Text> : null}
    </View>
  );
}

export const renderers = [{
  tester: rankWith(20, and(uiTypeIs("Control"), schemaTypeIs("array"))),
  renderer: withJsonFormsArrayLayoutProps(ArrayControl),
}];
