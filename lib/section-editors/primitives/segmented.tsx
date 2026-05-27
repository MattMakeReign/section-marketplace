"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

/**
 * Segmented — pill row of 2–4 mutually-exclusive options. Selected option
 * has a dark fill (surface-inverse) + light text. Radix ToggleGroup under
 * the hood for keyboard + ARIA.
 *
 *   <Segmented
 *     value={direction}
 *     onChange={setDirection}
 *     options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]}
 *   />
 */

type Option<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<Option<T>>;
  ariaLabel?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        // Radix sends "" when the user clicks the active item. Ignore it —
        // segmented controls are always-on (one option must be selected).
        if (v) onChange(v as T);
      }}
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
