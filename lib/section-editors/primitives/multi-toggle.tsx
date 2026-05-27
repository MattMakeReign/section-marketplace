"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

/**
 * MultiToggle — pill row where 0..N options can be on simultaneously.
 * Used for "which columns visible", "hide on which breakpoints", etc.
 * Same visual as Segmented; semantics differ (Radix `type="multiple"`).
 */

type Option<T extends string> = { value: T; label: string };

export function MultiToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T[];
  onChange: (v: T[]) => void;
  options: ReadonlyArray<Option<T>>;
  ariaLabel?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      value={value}
      onValueChange={(v) => onChange(v as T[])}
      className="ds-segmented"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <ToggleGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          className="ds-segmented__item"
        >
          {opt.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
