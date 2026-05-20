"use client";

import { forwardRef } from "react";
import { cn } from "../lib/cn";

/**
 * Skeleton — neutral placeholder rectangle with a subtle shimmer.
 * Use as `<Skeleton style={{ width: 120, height: 14 }} />` or pass custom
 * className for shape.
 */
export const Skeleton = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mr-skeleton", className)} {...props} />
));
Skeleton.displayName = "Skeleton";
