"use client";

import { forwardRef, type ReactNode } from "react";
import { cva, type VariantProps } from "../lib/cva";
import { cn } from "../lib/cn";

const badgeVariants = cva("mr-badge", {
  variants: {
    tone: {
      neutral: "",
      "track-stable": "mr-badge--track-stable",
      "track-experimental": "mr-badge--track-experimental",
      "track-legacy": "mr-badge--track-legacy",
      lifecycle: "mr-badge--lifecycle",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof badgeVariants> {
  /** Optional leading status dot. CSS colour string. */
  dotColor?: string;
  children?: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, dotColor, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props}>
      {dotColor ? (
        <span
          className="mr-badge__dot"
          style={{ background: dotColor }}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  ),
);
Badge.displayName = "Badge";

export { badgeVariants };
