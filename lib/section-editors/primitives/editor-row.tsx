"use client";

import type { ReactNode } from "react";

/**
 * EditorRow — label + control pair. Two layouts:
 *   - default: 110px label gutter + control filling the rest (good for short
 *     controls like sliders, segmented, toggles, steppers)
 *   - stacked: label above, control below (good for full-width controls like
 *     the media manager)
 */

export function EditorRow({
  label,
  children,
  stacked = false,
}: {
  label: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={`ds-edit-row ${stacked ? "ds-edit-row--stacked" : ""}`.trim()}>
      <label className="ds-edit-row__label">{label}</label>
      <div>{children}</div>
    </div>
  );
}
