"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

/**
 * Button — the primary action surface.
 *
 * Variants:
 *   - variant: primary | secondary | tertiary | ghost | danger
 *   - size: sm | md | lg
 *   - shape: rect | pill | circle
 *
 * Supports `asChild` (via Radix Slot) — wrap any element with button styling
 * without a nested <button>. Common for <Link asChild>.
 */

const buttonVariants = cva("mr-button", {
  variants: {
    variant: {
      primary: "mr-button--primary",
      secondary: "mr-button--secondary",
      tertiary: "mr-button--tertiary",
      ghost: "mr-button--ghost",
      danger: "mr-button--danger",
    },
    size: {
      sm: "mr-button--sm",
      md: "mr-button--md",
      lg: "mr-button--lg",
    },
    shape: {
      rect: "",
      pill: "mr-button--pill",
      circle: "mr-button--circle",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
    shape: "rect",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
