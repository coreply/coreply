import { rankWith, uiTypeIs, type ControlProps } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Platform, View } from "react-native";
import { Text } from "../components/ui/text";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Icon } from "../components/ui/icon";
import { Eye, EyeOff } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { useLingui } from "@lingui/react";
import { Trans, useLingui as useLinguiMacro } from "@lingui/react/macro";

function getStringControlType(
  schema: ControlProps["schema"] & { feature?: string; control?: string },
) {
  if (schema.control === "textarea") {
    return "textarea";
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
  const { i18n } = useLingui();
  return (
    <View className="mb-4 gap-1.5">
      {hasTextContent(label) ? (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium">
            {label}
            {required && " *"}
          </Text>
          {required && (
            <Text className="text-xs text-muted-foreground font-sans">
              <Trans comment="Indicates that a form field is required">Required</Trans>
            </Text>
          )}
        </View>
      ) : null}
      {children}
      {hasTextContent(errors) ? (
        <Text className="text-xs text-destructive font-sans">{errors}</Text>
      ) : hasTextContent(description) ? (
        <Text className="text-xs text-muted-foreground font-sans">
          {i18n._(description)}
        </Text>
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
  visible,
}: ControlProps & {
  schema: ControlProps["schema"] & {
    feature?: string;
    control?: string;
    textareaSize?: "s" | "m" | "l";
  };
}) => {
  const { t } = useLinguiMacro();
  const [passwordVisible, setPasswordVisible] = useState(false);
  if (!visible) return null;
  const isEnabled = enabled !== false;
  const isNumeric = schema.type === "number" || schema.type === "integer";
  const isInteger = schema.type === "integer";
  const inputType = isNumeric ? "numeric" : "default";
  const controlType = getStringControlType(schema);
  const isMultiline = controlType === "textarea";
  const isPassword = schema.feature === "password";
  const multilineClassName =
    schema.textareaSize === "s"
      ? "h-36 min-h-36 py-3"
      : schema.textareaSize === "m"
        ? "h-48 min-h-48 py-3"
        : "h-64 min-h-64 py-3";
  const multilineNumberOfLines =
    schema.textareaSize === "s" ? 3 : schema.textareaSize === "m" ? 4 : 6;
  const value = data === undefined || data === null ? "" : String(data);
  const hasErrors = Boolean(errors);

  const baseInput = (
    <Input
      value={value}
      onChangeText={(value) => {
        if (!isEnabled) {
          return;
        }
        if (value === "") {
          handleChange(path, undefined);
          return;
        }
        if (!isNumeric) {
          handleChange(path, value);
          return;
        }

        const nextValue = isInteger
          ? Number.parseInt(value, 10)
          : Number(value);
        handleChange(path, Number.isNaN(nextValue) ? undefined : nextValue);
      }}
      className={[
        "font-sans shadow-none",
        isPassword ? "pr-9" : undefined,
        isMultiline && (!isPassword || passwordVisible)
          ? multilineClassName
          : undefined,
        hasErrors ? "border-destructive" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      keyboardType={inputType}
      aria-invalid={hasErrors}
      editable={isEnabled}
      multiline={isMultiline && (!isPassword || passwordVisible)}
      numberOfLines={
        isMultiline && (!isPassword || passwordVisible)
          ? multilineNumberOfLines
          : undefined
      }
      textAlignVertical={
        isMultiline && (!isPassword || passwordVisible) ? "top" : undefined
      }
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
            aria-label={passwordVisible ? t`Hide password` : t`Show password`}
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
