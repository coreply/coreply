import { rankWith, uiTypeIs, type ControlProps } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Platform, View } from "react-native";
import { Text } from "../components/ui/text";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Icon } from "../components/ui/icon";
import { Eye, EyeOff } from "lucide-react-native";
import { type ReactNode, useState } from "react";

function getStringControlType(schema: any) {
  if (schema.control === "textarea") {
    return "textarea";
  }

  if (schema.control === "password") {
    return "password";
  }

  return "default";
}

function hasTextContent(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function FieldShell({
  label,
  required,
  description,
  errors,
  children,
}: {
  label?: string;
  required?: boolean;
  description?: string;
  errors?: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 gap-1.5">
      {hasTextContent(label) ? (
        <Text className="text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
          {label}
          {required && " *"}
        </Text>
      ) : null}
      {children}
      {hasTextContent(errors) ? (
        <Text className="text-xs text-destructive font-sans">{errors}</Text>
      ) : hasTextContent(description) ? (
        <Text className="text-xs text-muted-foreground">{description}</Text>
      ) : null}
    </View>
  );
}

const InputControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
  errors,
  enabled,
}: ControlProps) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isEnabled = enabled !== false;
  const isNumeric = schema.type === "number" || schema.type === "integer";
  const isInteger = schema.type === "integer";
  const inputType = isNumeric ? "numeric" : "default";
  const controlType = getStringControlType(schema);
  const isMultiline = controlType === "textarea";
  const isPassword = controlType === "password";
  const value = data === undefined || data === null ? "" : String(data);
  const hasErrors = Boolean(errors);

  const baseInput = (
    <Input
      value={value}
      onChangeText={(value) => {
        if (!isEnabled) {
          return;
        }

        if (!isNumeric) {
          handleChange(path, value);
          return;
        }

        if (value === "") {
          handleChange(path, undefined);
          return;
        }

        const nextValue = isInteger
          ? Number.parseInt(value, 10)
          : Number(value);
        handleChange(path, Number.isNaN(nextValue) ? undefined : nextValue);
      }}
      className={[
        "shadow-none",
        isMultiline ? "h-64 min-h-64 py-3" : undefined,
        hasErrors ? "border-destructive" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      keyboardType={inputType}
      aria-invalid={hasErrors}
      editable={isEnabled}
      multiline={isMultiline}
      numberOfLines={isMultiline ? 6 : undefined}
      textAlignVertical={isMultiline ? "top" : undefined}
      secureTextEntry={isPassword && !passwordVisible}
      autoCapitalize={isPassword ? "none" : undefined}
      autoCorrect={isPassword ? false : undefined}
    />
  );

  return (
    <FieldShell
      label={label}
      required={required}
      description={schema.description}
      errors={errors}
    >
      {isPassword ? (
        <View className="relative">
          {baseInput}
          <Button
            variant="ghost"
            size="icon"
            className={[
              "absolute right-0",
              Platform.OS === "web" ? "cursor-pointer" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            onPress={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            disabled={!isEnabled}
          >
            <Icon
              as={passwordVisible ? EyeOff : Eye}
              className="text-input"
              size={18}
            />
          </Button>
        </View>
      ) : (
        baseInput
      )}
    </FieldShell>
  );
};

// Input is the ultimate fallback for any control that is not handled by a more specific renderer. Thus having lower rank but broader tester.
export const inputTester = rankWith(3, uiTypeIs("Control"));

export const InputRenderer = withJsonFormsControlProps(InputControl);

export const renderers = [{ tester: inputTester, renderer: InputRenderer }];
