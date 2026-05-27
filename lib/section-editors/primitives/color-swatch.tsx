"use client";

import { useRef } from "react";

/**
 * ColorSwatch — row of: square swatch · hex pill · opacity pill · eyedropper.
 *
 * Click the swatch to open the native colour picker (most reliable).
 * Click the eyedropper to use the modern EyeDropper API where supported
 * (Chromium-based browsers); falls back to the native picker otherwise.
 */

export function ColorSwatch({
  value,
  onChange,
  opacity = 100,
  onOpacityChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function pickFromScreen() {
    // EyeDropper API — Chromium-only as of 2026. Falls back to native picker.
    type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
    const W = window as unknown as { EyeDropper?: EyeDropperCtor };
    if (W.EyeDropper) {
      try {
        const result = await new W.EyeDropper().open();
        onChange(result.sRGBHex);
        return;
      } catch {
        // user cancelled or unsupported — fall through to native picker
      }
    }
    inputRef.current?.click();
  }

  return (
    <div className="ds-color-swatch" aria-label={ariaLabel}>
      <label
        className="ds-color-swatch__btn"
        style={{ background: value }}
        aria-label={`Colour ${value}`}
      >
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ds-color-swatch__native"
          aria-label="Colour picker"
        />
      </label>
      <span className="ds-color-swatch__field ds-color-swatch__field--hex">
        {value.toUpperCase()}
      </span>
      {onOpacityChange ? (
        <input
          type="number"
          className="ds-color-swatch__field ds-color-swatch__field--num"
          value={opacity}
          min={0}
          max={100}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          aria-label="Opacity"
        />
      ) : (
        <span className="ds-color-swatch__field ds-color-swatch__field--num">{opacity}%</span>
      )}
      <button
        type="button"
        className="ds-color-swatch__eye"
        onClick={pickFromScreen}
        aria-label="Pick colour from screen"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M8.5 1.5l2 2-2.5 2.5-1-1L4 8l-1.5.5L3 7l2-2-1-1L6.5 1.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
