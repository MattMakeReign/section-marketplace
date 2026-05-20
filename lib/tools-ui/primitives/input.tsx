"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

const inputVariants = cva("mr-input", {
  variants: {
    size: {
      sm: "mr-input--sm",
      md: "",
      lg: "mr-input--lg",
    },
    state: {
      default: "",
      error: "mr-input--error",
    },
  },
  defaultVariants: {
    size: "md",
    state: "default",
  },
});

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputVariants({ size, state }), className)}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { inputVariants };
