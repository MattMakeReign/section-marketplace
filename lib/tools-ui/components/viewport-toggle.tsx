"use client";

import { ToggleGroup, ToggleGroupItem } from "../primitives/toggle-group";

export type ViewportName = "desktop" | "tablet" | "mobile";

/**
 * ViewportToggle — Desktop / Tablet / Mobile radio-style switch. Used on
 * the section detail page to scale the preview iframe. Wraps ToggleGroup.
 */

export function ViewportToggle({
  value,
  onChange,
  ariaLabel = "Preview viewport",
  className,
}: {
  value: ViewportName;
  onChange: (next: ViewportName) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v === "desktop" || v === "tablet" || v === "mobile") onChange(v);
      }}
      aria-label={ariaLabel}
      className={className}
    >
      <ToggleGroupItem value="desktop" aria-label="Desktop viewport">
        Desktop
      </ToggleGroupItem>
      <ToggleGroupItem value="tablet" aria-label="Tablet viewport">
        Tablet
      </ToggleGroupItem>
      <ToggleGroupItem value="mobile" aria-label="Mobile viewport">
        Mobile
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
