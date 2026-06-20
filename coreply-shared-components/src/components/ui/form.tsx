import React, { useMemo } from "react";
import { JsonForms } from "@jsonforms/react";
import { View } from "react-native";
import { Text } from "./text";
import { z, type ZodSchema } from "zod";
import { customRenderers } from "../../renderers";

interface SchemaFormProps<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  data: T;
  onChange: (data: T) => void;
  title?: string;
  className?: string;
}

export function SchemaForm<T extends Record<string, any>>({
  schema,
  data,
  onChange,
  title,
  className,
}: SchemaFormProps<T>) {
  // Convert Zod schema to JSON Schema
  const jsonSchema = useMemo(() => {
    return z.toJSONSchema(schema, {
      target: "openapi-3.0",
    });
  }, [schema]);

  return (
    <View
      className={className || "p-3 border-gray-300 border bg-white rounded-lg"}
    >
      {title && (
        <Text
          className="mb-3 text-base"
          style={{ fontFamily: "Outfit_500Medium" }}
        >
          {title}
        </Text>
      )}
      <JsonForms
        schema={jsonSchema}
        data={data}
        onChange={({ data: newData }) => onChange(newData as T)}
        renderers={customRenderers}
        validationMode="ValidateAndShow"
      />
    </View>
  );
}
