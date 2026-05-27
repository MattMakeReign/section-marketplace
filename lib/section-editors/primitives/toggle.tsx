"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";

/**
 * Toggle — binary on/off pill switch. Dark when on.
 */

export function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      className="ds-toggle"
      aria-label={ariaLabel}
    >
      <SwitchPrimitive.Thumb className="ds-toggle__thumb" />
    </SwitchPrimitive.Root>
  );
}
