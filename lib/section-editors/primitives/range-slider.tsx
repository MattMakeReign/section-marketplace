"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

/**
 * RangeSlider — two-handle fill slider for picking a min/max sub-range.
 * Visual: track with a dark fill spanning [low, high]. Both ends drag.
 * Used for "show items 3–7", "autoplay between 2s and 6s", etc.
 */

export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format = (v) => String(Math.round(v)),
}: {
  value: [number, number];
  onChange: (v: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const display = `${format(value[0])} – ${format(value[1])}`;
  const span = max - min;
  const lowPct = Math.max(0, Math.min(100, ((value[0] - min) / span) * 100));
  const highPct = Math.max(0, Math.min(100, ((value[1] - min) / span) * 100));
  return (
    <SliderPrimitive.Root
      className="ds-fill-slider"
      value={value}
      onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={1}
    >
      <SliderPrimitive.Track className="ds-fill-slider__track">
        <SliderPrimitive.Range className="ds-fill-slider__range ds-fill-slider__range--span" />
        <span className="ds-fill-slider__value ds-fill-slider__value--base" aria-hidden>
          {display}
        </span>
        <span
          className="ds-fill-slider__value ds-fill-slider__value--over"
          aria-hidden
          style={{ clipPath: `inset(0 ${100 - highPct}% 0 ${lowPct}%)` }}
        >
          {display}
        </span>
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="ds-fill-slider__thumb ds-fill-slider__thumb--range" aria-label="Range start" />
      <SliderPrimitive.Thumb className="ds-fill-slider__thumb ds-fill-slider__thumb--range" aria-label="Range end" />
    </SliderPrimitive.Root>
  );
}
