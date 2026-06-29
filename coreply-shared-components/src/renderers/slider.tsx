import {
  and,
  rankWith,
  schemaMatches,
  uiTypeIs,
  type JsonSchema,
  type ControlProps,
} from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { View } from "react-native";
import { Slider } from "../components/ui/slider";
import { Text } from "../components/ui/text";

type NumericJsonSchema = JsonSchema & {
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};

function hasExplicitSliderBounds(schema: any) {
  console.log("schema", schema);
  if (schema.type !== "number" && schema.type !== "integer") {
    return false;
  }
  if (schema.minimum == undefined || schema.maximum == undefined) {
    return false;
  }
  if (
    typeof schema.minimum !== "number" ||
    typeof schema.maximum !== "number"
  ) {
    return false;
  }
  if (
    schema.minimum === Number.MIN_SAFE_INTEGER ||
    schema.maximum === Number.MAX_SAFE_INTEGER
  ) {
    return false;
  }
  if (schema.maximum <= schema.minimum) {
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
}: ControlProps & { label?: string; required?: boolean; data: number }) => {
  const numericSchema = schema as NumericJsonSchema;
  const isInteger = numericSchema.type === "integer";
  const minimum = numericSchema.minimum as number;
  const maximum = numericSchema.maximum as number;
  const step = numericSchema.multipleOf
    ? numericSchema.multipleOf
    : (maximum - minimum) / 20;

  return (
    <View className="mb-4 gap-1.5">
      {label && (
        <View className="flex-row items-center gap-2">
          <Text className="text-sm" style={{ fontFamily: "Outfit_500Medium" }}>
            {label}:
          </Text>
          <Text className="text-muted-foreground text-sm font-sans">
            {data}
          </Text>
        </View>
      )}
      <Slider
        value={data}
        min={minimum}
        max={maximum}
        step={isInteger ? Number(step.toFixed(0)) : step}
        aria-invalid={errors ? true : undefined}
        disabled={!enabled}
        trackClassName={errors ? "bg-destructive/20" : "bg-brand-800"}
        rangeClassName={errors ? "border-destructive" : "border-primary"}
        thumbClassName={errors ? "text-destructive" : "text-input"}
        onValueChange={(value) => {
          if (!enabled) {
            return;
          }
          handleChange(path, value);
        }}
      />

      {numericSchema.description ? (
        <Text className="text-xs text-muted-foreground font-sans">
          {numericSchema.description}
        </Text>
      ) : null}
      {errors ? (
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
