"use client";

import { forwardRef } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

const labelVariants = cva("mr-label", {
  variants: {
    size: {
      sm: "mr-label--sm",
      md: "",
      lg: "mr-label--lg",
    },
  },
  defaultVariants: { size: "md" },
});

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

export const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, size, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ size }), className)}
    {...props}
  />
));
Label.displayName = "Label";
