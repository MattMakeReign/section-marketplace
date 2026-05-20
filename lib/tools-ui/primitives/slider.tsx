"use client";

import { forwardRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../lib/cn";

/**
 * Slider — Radix Slider primitive themed to the tools-ui language.
 *
 * Soft grey track + dark fg range fill + circular thumb with hairline
 * border + subtle shadow. Use for any ordinal range — single thumb
 * (default) or multiple thumbs (Radix supports both).
 *
 * Optional discrete-step rendering via Radix's `step` prop; the
 * consumer can render labels under the slider for tick-style picking.
 */

export const Slider = forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("mr-slider", className)}
    {...props}
  >
    <SliderPrimitive.Track className="mr-slider__track">
      <SliderPrimitive.Range className="mr-slider__range" />
    </SliderPrimitive.Track>
    {/* Render one thumb per value entry. Defaults to a single thumb when
     * defaultValue/value is a single-item array. */}
    {(Array.isArray(props.value) ? props.value : Array.isArray(props.defaultValue) ? props.defaultValue : [0]).map((_, i) => (
      <SliderPrimitive.Thumb key={i} className="mr-slider__thumb" />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
