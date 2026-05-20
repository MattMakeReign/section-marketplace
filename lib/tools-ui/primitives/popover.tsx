"use client";

import { forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../lib/cn";

/**
 * Popover — floating panel anchored to a trigger. Built on Radix Popover.
 *
 * Use:
 *   <Popover>
 *     <PopoverTrigger asChild><Button>Filter</Button></PopoverTrigger>
 *     <PopoverContent align="start" sideOffset={8}>...</PopoverContent>
 *   </Popover>
 */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverPortal = PopoverPrimitive.Portal;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
  <PopoverPortal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn("mr-popover__content", className)}
      {...props}
    />
  </PopoverPortal>
));
PopoverContent.displayName = "PopoverContent";
