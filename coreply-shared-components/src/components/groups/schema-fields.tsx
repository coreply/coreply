import { useMemo, useState, type ReactNode } from "react";
import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";
import { Trans } from "@lingui/react/macro";
import { Plus } from "lucide-react-native";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Text } from "../ui/text";
import {
  createSchemaUiSchema,
  hasAdvancedSettings,
} from "../../renderers/schema-rules";

export function SchemaFields({
  schema,
  children,
}: {
  schema: JsonSchema;
  children: (uiSchema: UISchemaElement) => ReactNode;
}) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const uiSchema = useMemo(
    () => createSchemaUiSchema(schema, showAdvancedSettings),
    [schema, showAdvancedSettings],
  );

  return (
    <>
      {children(uiSchema)}
      {!showAdvancedSettings && hasAdvancedSettings(schema) && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onPress={() => setShowAdvancedSettings(true)}
        >
          <Icon as={Plus} className="size-4" />
          <Text>
            <Trans comment="Button below a form that reveals its advanced settings">
              More Settings
            </Trans>
          </Text>
        </Button>
      )}
    </>
  );
}
