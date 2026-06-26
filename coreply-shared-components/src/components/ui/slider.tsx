import { cn } from "@/lib/utils";
import NativeSlider from "@react-native-community/slider";
import * as React from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const StyledNativeSlider = withUniwind(NativeSlider, {
  maximumTrackTintColor: {
    fromClassName: "trackClassName",
    styleProperty: "backgroundColor",
  },
  minimumTrackTintColor: {
    fromClassName: "rangeClassName",
    styleProperty: "borderColor",
  },
  thumbTintColor: {
    fromClassName: "thumbClassName",
    styleProperty: "color",
  },
});

type SliderProps = Omit<React.ComponentProps<typeof NativeSlider>, "value" | "onValueChange"> & {
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  min?: number;
  max?: number;
  value?: number;
  onValueChange?: (values: number[]) => void;
};

function Slider({
  className,
  trackClassName,
  rangeClassName,
  thumbClassName,
  min = 0,
  max = 100,
  value,
  onValueChange,
  ...props
}: SliderProps) {
  const safeValue = typeof value === "number" ? value : min;

  return (
    <View className={cn("w-full justify-center py-2", className)}>
      <StyledNativeSlider
        minimumValue={min}
        maximumValue={max}
        value={safeValue}
        trackClassName={trackClassName}
        rangeClassName={rangeClassName}
        thumbClassName={thumbClassName}
        onValueChange={onValueChange ? (nextValue) => onValueChange([nextValue]) : undefined}
        {...props}
      />
    </View>
  );
}

export { Slider };
