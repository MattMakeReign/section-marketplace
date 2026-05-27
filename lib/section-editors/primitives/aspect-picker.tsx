"use client";

/**
 * AspectPicker — segmented row where each option is a small SVG rectangle
 * in that aspect ratio + label. For image / card / video aspect choice.
 */

export type AspectValue = "1:1" | "4:5" | "3:4" | "16:9" | "9:16";

const RATIOS: Record<AspectValue, { w: number; h: number }> = {
  "1:1": { w: 14, h: 14 },
  "4:5": { w: 12, h: 15 },
  "3:4": { w: 12, h: 16 },
  "16:9": { w: 18, h: 10 },
  "9:16": { w: 10, h: 18 },
};

export function AspectPicker({
  value,
  onChange,
  options,
}: {
  value: AspectValue;
  onChange: (v: AspectValue) => void;
  options: ReadonlyArray<AspectValue>;
}) {
  return (
    <div className="ds-aspect-picker">
      {options.map((opt) => {
        const { w, h } = RATIOS[opt];
        const selected = opt === value;
        return (
          <button
            key={opt}
            type="button"
            className="ds-aspect-picker__opt"
            data-selected={selected ? "true" : "false"}
            onClick={() => onChange(opt)}
            aria-label={`Aspect ratio ${opt}`}
          >
            <span className="ds-aspect-picker__icon" aria-hidden>
              <svg width="24" height="20" viewBox="0 0 24 20">
                <rect
                  x={(24 - w) / 2}
                  y={(20 - h) / 2}
                  width={w}
                  height={h}
                  rx="1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </span>
            <span className="ds-aspect-picker__label">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
