"use client";

/**
 * Stepper — [−] value [+] for small ordinal counts (item count, columns,
 * tier count). Clamps at min/max.
 */

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className="ds-stepper" role="group" aria-label="Stepper">
      <button
        type="button"
        className="ds-stepper__btn"
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <span className="ds-stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="ds-stepper__btn"
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
