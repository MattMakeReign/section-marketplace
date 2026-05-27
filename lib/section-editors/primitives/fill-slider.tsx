"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

/**
 * FillSlider — the headline editor primitive.
 *
 * A Radix Slider rendered as a tall bar where the filled portion grows
 * left-to-right from min → value. The numeric value sits inline on top of
 * the bar; it's rendered twice (dark base text + light overlay text), and
 * the overlay is clipped via clip-path to ONLY the filled region so the
 * number stays readable both inside and outside the fill.
 *
 *   <FillSlider value={50} onChange={setV} min={0} max={100} />
 *   <FillSlider value={0.54} onChange={setV} min={0} max={1} step={0.01}
 *               format={(v) => v.toFixed(2)} />
 */

export function FillSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format = (v) => String(Math.round(v)),
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const fillPct = percent * 100;
  const display = format(value);

  return (
    <SliderPrimitive.Root
      className="ds-fill-slider"
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
    >
      <SliderPrimitive.Track className="ds-fill-slider__track">
        <SliderPrimitive.Range className="ds-fill-slider__range" />
        <span className="ds-fill-slider__value ds-fill-slider__value--base" aria-hidden>
          {display}
        </span>
        <span
          className="ds-fill-slider__value ds-fill-slider__value--over"
          aria-hidden
          style={{ clipPath: `inset(0 ${100 - fillPct}% 0 0)` }}
        >
          {display}
        </span>
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="ds-fill-slider__thumb" aria-label="Value" />
    </SliderPrimitive.Root>
  );
}
