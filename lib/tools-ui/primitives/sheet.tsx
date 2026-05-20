"use client";

import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

/**
 * Sheet — Radix Dialog presented as a slide-in drawer. Use side="left|right"
 * (top/bottom optional). Default animation is opacity + transform; for
 * precise px-offset animations tied to other elements (e.g. the marketplace
 * detail page's stage shift), keep a WAAPI controller co-located.
 */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetPortal = DialogPrimitive.Portal;
export const SheetClose = DialogPrimitive.Close;

export const SheetOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("mr-sheet__overlay", className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const sheetContentVariants = cva("mr-sheet__content", {
  variants: {
    side: {
      right: "mr-sheet__content--right",
      left: "mr-sheet__content--left",
      top: "mr-sheet__content--top",
      bottom: "mr-sheet__content--bottom",
    },
  },
  defaultVariants: { side: "right" },
});

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {}

export const SheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, side = "right", children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetContentVariants({ side }), className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

export const SheetTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("mr-sheet__title", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("mr-sheet__description", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
