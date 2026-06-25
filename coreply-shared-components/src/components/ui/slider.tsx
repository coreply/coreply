import { cn } from "@/lib/utils";
import * as SliderPrimitive from "@rn-primitives/slider";
import * as React from "react";
import { Platform } from "react-native";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
};

function Slider({
  className,
  trackClassName,
  rangeClassName,
  thumbClassName,
  min = 0,
  max = 100,
  value,
  ...props
}: SliderProps) {
  const safeValue = typeof value === "number" ? value : min;

  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      value={safeValue}
      className={cn("flex w-full justify-center py-2", className)}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "bg-muted relative flex h-2 w-full items-center rounded-full [&_span]:top-1/2",
          trackClassName,
        )}
      >
        <SliderPrimitive.Range className={cn("bg-primary h-full rounded-full", rangeClassName)} />
        <SliderPrimitive.Thumb
          className={cn(
            "border-primary bg-background flex size-5 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-sm shadow-black/10",
            Platform.select({
              web: "ring-offset-background focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 outline-none",
            }),
            thumbClassName,
          )}
        />
      </SliderPrimitive.Track>
    </SliderPrimitive.Root>
  );
}

export { Slider };
