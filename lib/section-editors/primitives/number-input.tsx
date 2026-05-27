"use client";

/**
 * NumberInput — raw numeric entry with optional unit suffix (px, ms, %).
 * Use when a stepper would feel wrong (free-form values, non-integer steps).
 */

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="ds-number-input">
      <input
        type="number"
        className="ds-number-input__field"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
      />
      {unit ? <span className="ds-number-input__unit">{unit}</span> : null}
    </div>
  );
}
