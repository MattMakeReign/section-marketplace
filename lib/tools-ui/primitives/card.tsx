"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

const cardVariants = cva("mr-card", {
  variants: {
    variant: {
      surface: "mr-card--surface",
      muted: "mr-card--muted",
    },
    interactive: {
      true: "mr-card--interactive",
      false: "",
    },
  },
  defaultVariants: { variant: "surface", interactive: false },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { cardVariants };
