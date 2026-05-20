"use client";

import { forwardRef } from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

const progressVariants = cva("mr-progress", {
  variants: {
    tone: {
      neutral: "",
      accent: "mr-progress--accent",
      success: "mr-progress--success",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number | null;
}

export const Progress = forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, tone, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value ?? 0}
    className={cn(progressVariants({ tone }), className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="mr-progress__indicator"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
