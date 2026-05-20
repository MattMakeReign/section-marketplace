"use client";

import { forwardRef } from "react";
import { cn } from "../lib/cn";
import { Label, type LabelProps } from "./label";

/**
 * Field — composition wrapper for a form control.
 *
 * Use as:
 *   <Field>
 *     <FieldLabel>Email</FieldLabel>
 *     <Input type="email" />
 *     <FieldDescription>We'll never share it.</FieldDescription>
 *     <FieldError>Required</FieldError>
 *   </Field>
 *
 * Field itself is a flex column with consistent gap. Children compose as
 * the consumer wishes — order is theirs.
 */

export const Field = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mr-field", className)} {...props} />
));
Field.displayName = "Field";

export const FieldLabel = forwardRef<
  React.ElementRef<typeof Label>,
  LabelProps
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("mr-field__label", className)}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

export const FieldDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("mr-field__description", className)} {...props} />
));
FieldDescription.displayName = "FieldDescription";

export const FieldError = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, role = "alert", ...props }, ref) => (
  <p
    ref={ref}
    role={role}
    className={cn("mr-field__error", className)}
    {...props}
  />
));
FieldError.displayName = "FieldError";
