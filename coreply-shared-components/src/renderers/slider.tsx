import {
  and,
  rankWith,
  schemaMatches,
  uiTypeIs,
  type JsonSchema,
} from "@jsonforms/core";
import { withJsonFormsControlProps, type ControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Slider } from "../components/ui/slider";
import { Text } from "../components/ui/text";

type NumericJsonSchema = JsonSchema & {
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};

const SAFE_INTEGER_MIN = Number.MIN_SAFE_INTEGER;
const SAFE_INTEGER_MAX = Number.MAX_SAFE_INTEGER;

function hasTextContent(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasExplicitSliderBounds(schema: NumericJsonSchema) {
  if (schema.type !== "number" && schema.type !== "integer") {
    return false;
  }

  const minimum = schema.minimum;
  const maximum = schema.maximum;

  if (typeof minimum !== "number" || typeof maximum !== "number") {
    return false;
  }

  if (maximum <= minimum) {
    return false;
  }

  if (
    schema.type === "integer" &&
    minimum === SAFE_INTEGER_MIN &&
    maximum === SAFE_INTEGER_MAX
  ) {
    return false;
  }

  return true;
}

function getStep(minimum: number, maximum: number, multipleOf?: number) {
  if (typeof multipleOf === "number" && multipleOf > 0) {
    return multipleOf;
  }

  const span = maximum - minimum;
  if (span <= 0) {
    return 1;
  }

  return span / 10;
}

function roundToStep(
  value: number,
  minimum: number,
  step: number,
  isInteger: boolean,
) {
  if (step <= 0) {
    return isInteger ? Math.round(value) : value;
  }

  const stepped = minimum + Math.round((value - minimum) / step) * step;
  if (isInteger) {
    return Math.round(stepped);
  }

  const precision = step.toString().split(".")[1]?.length ?? 0;
  return Number(stepped.toFixed(precision));
}

const SliderControl = ({
  handleChange,
  path,
  data,
  schema,
  label,
  required,
  errors,
  enabled,
}: ControlProps & { label?: string; required?: boolean }) => {
  const numericSchema = schema as NumericJsonSchema;
  const isEnabled = enabled !== false;
  const isInteger = numericSchema.type === "integer";
  const minimum = numericSchema.minimum as number;
  const maximum = numericSchema.maximum as number;
  const step = getStep(minimum, maximum, numericSchema.multipleOf);
  const fallbackValue = minimum;
  const numericValue = typeof data === "number" ? data : fallbackValue;
  const clampedValue = Math.min(maximum, Math.max(minimum, numericValue));
  const displayValue = isInteger ? Math.round(clampedValue) : clampedValue;
  const hasErrors = Boolean(errors);

  return (
    <View className="mb-4 gap-1.5">
      {label && (
        <View className="flex-row items-center gap-2">
          <Text className="text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
            {label}:
          </Text>
          <Text className="text-muted-foreground text-sm font-sans">
            {displayValue}
          </Text>
        </View>
      )}
      <Slider
        value={clampedValue}
        min={minimum}
        max={maximum}
        step={step}
        aria-invalid={hasErrors}
        disabled={!isEnabled}
        trackClassName={hasErrors ? "bg-destructive/20" : "bg-brand-800"}
        rangeClassName={hasErrors ? "border-destructive" : "border-primary"}
        thumbClassName={hasErrors ? "text-destructive" : "text-input"}
        onValueChange={(values) => {
          if (!isEnabled) {
            return;
          }

          const nextValue = values[0];
          if (typeof nextValue !== "number") {
            return;
          }

          handleChange(path, roundToStep(nextValue, minimum, step, isInteger));
        }}
      />

      {hasTextContent(numericSchema.description) ? (
        <Text className="text-xs text-muted-foreground font-sans">
          {numericSchema.description}
        </Text>
      ) : null}
      {hasTextContent(errors) ? (
        <Text className="text-xs text-destructive font-sans">{errors}</Text>
      ) : null}
    </View>
  );
};

export const sliderTester = rankWith(
  20,
  and(
    uiTypeIs("Control"),
    schemaMatches((schema) =>
      hasExplicitSliderBounds(schema as NumericJsonSchema),
    ),
  ),
);

export const SliderRenderer = withJsonFormsControlProps(SliderControl);

export const renderers = [{ tester: sliderTester, renderer: SliderRenderer }];
