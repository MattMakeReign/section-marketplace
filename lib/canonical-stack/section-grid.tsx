/**
 * <SectionGrid> — the inner content container for every section.
 *
 * Per the layout contract: sections are edge-to-edge of the viewport.
 * SectionGrid is the constrained, centred, 12-column grid that holds
 * a section's content.
 *
 *   --grid-max     1440px  content max-width
 *   --grid-columns 12      column count (used informationally; column
 *                          template is hardcoded to 12 for runtime
 *                          stability across browsers)
 *   --grid-gutter  24px    column + row gap
 *   --grid-margin  24px    minimum side gutter when below grid-max
 *
 * Children opt into columns via Tailwind's `col-span-N` utilities,
 * e.g. `<div className="col-span-12 md:col-span-6">`.
 *
 * For non-grid content (a flex row, a single block), wrap in a
 * `<div className="col-span-12">…</div>`.
 */

import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";

const STYLE: CSSProperties = {
  maxWidth: "var(--grid-max)",
  marginInline: "auto",
  paddingInline: "var(--grid-margin)",
  display: "grid",
  // CSS var inside repeat()'s count arg is supported in modern browsers
  // (Chrome 91+, Safari 14.1+, Firefox 89+). Fallback to 12 if unset.
  gridTemplateColumns: "repeat(var(--grid-columns, 12), minmax(0, 1fr))",
  columnGap: "var(--grid-gutter)",
  rowGap: "var(--grid-gutter)",
  width: "100%",
};

export type SectionGridProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * `forwardRef` so sections can attach a ref to the grid container — required
 * for the canonical `useReveal` pattern when the trigger element IS the grid
 * (e.g. a row of cards that should reveal in sequence when the row enters
 * the viewport).
 */
export const SectionGrid = forwardRef<HTMLDivElement, SectionGridProps>(
  function SectionGrid({ children, className, style }, ref) {
    return (
      <div ref={ref} className={className} style={{ ...STYLE, ...style }}>
        {children}
      </div>
    );
  },
);
