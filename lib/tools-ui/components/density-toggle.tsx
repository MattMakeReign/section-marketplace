"use client";

import { ToggleGroup, ToggleGroupItem } from "../primitives/toggle-group";

/**
 * DensityToggle — radio-group of column-count buttons for a grid. Wraps the
 * ToggleGroup primitive; renders a small N-bars glyph per option.
 */

export function DensityToggle({
  value,
  onChange,
  options = [2, 3, 4],
  ariaLabel = "Grid density",
}: {
  value: number;
  onChange: (next: number) => void;
  options?: number[];
  ariaLabel?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(v) => {
        if (!v) return;
        const next = Number(v);
        if (Number.isFinite(next)) onChange(next);
      }}
      aria-label={ariaLabel}
      className="mr-density"
    >
      {options.map((n) => (
        <ToggleGroupItem
          key={n}
          value={String(n)}
          aria-label={`${n}-column grid`}
          className="mr-density__item"
        >
          <DensityIcon cols={n} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function DensityIcon({ cols }: { cols: number }) {
  // Bar widths + x-offsets pre-computed for optical balance in a 16-square viewBox.
  const layouts: Record<number, Array<{ x: number; w: number }>> = {
    2: [{ x: 3, w: 4 }, { x: 9, w: 4 }],
    3: [{ x: 2, w: 3 }, { x: 6.5, w: 3 }, { x: 11, w: 3 }],
    4: [{ x: 1.5, w: 2.5 }, { x: 5, w: 2.5 }, { x: 8.5, w: 2.5 }, { x: 12, w: 2.5 }],
  };
  const bars = layouts[cols] ?? layouts[3];
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={3} width={bar.w} height={10} rx={1} />
      ))}
    </svg>
  );
}
