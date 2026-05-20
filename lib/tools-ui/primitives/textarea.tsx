"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

const textareaVariants = cva("mr-textarea", {
  variants: {
    state: {
      default: "",
      error: "mr-textarea--error",
    },
  },
  defaultVariants: { state: "default" },
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(textareaVariants({ state }), className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
