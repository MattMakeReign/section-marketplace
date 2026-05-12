/**
 * <Section> — root wrapper for every marketplace section instance.
 *
 * Per `decision-section-identity`:
 *   - The `slug` is the stable ID. AI tools and code reference this.
 *   - The `position` is a per-route positional number, recomputed on render.
 *     Humans reference this in conversation ("make Section 03 punchier").
 *   - The `data-section-id` attribute is the contract the future Browser
 *     Workspace and commenting overlay consume to identify a section in the
 *     DOM.
 *
 * `position` is injected by <SectionsContainer> via React.Children.map +
 * cloneElement — sections never compute their own number.
 */

import type { ReactNode } from "react";

export type SectionProps = {
  /** Stable slug ID (e.g. "hero-split-bold"). Lowercase, hyphenated. */
  slug: string;
  /** Human-readable title (from section.json). Optional but recommended. */
  title?: string;
  /** Section version (from section.json). Optional. */
  version?: string;
  /** Marketplace category (e.g. "hero", "carousel"). Surfaced in the inspector label. */
  category?: string;
  /** Lifecycle status badge (Local / Draft / Submitted / etc.). Optional. */
  status?: string;
  /** Per-route positional number. Injected by <SectionsContainer>. */
  position?: number;
  /** Section content. */
  children: ReactNode;
  /** Optional className passthrough for layout sugar. */
  className?: string;
};

export function Section({
  slug,
  title,
  version,
  category,
  status,
  position,
  children,
  className,
}: SectionProps) {
  // Pad to two digits — Section 03, not Section 3 — per decision-section-identity.
  const positionLabel = typeof position === "number"
    ? String(position).padStart(2, "0")
    : undefined;

  return (
    <section
      data-section-id={slug}
      data-section-title={title}
      data-section-version={version}
      data-section-category={category}
      data-section-status={status}
      data-section-position={positionLabel}
      id={positionLabel ? `section-${positionLabel}` : `section-${slug}`}
      className={className}
    >
      {children}
    </section>
  );
}

/** Convenience: derive the Browser Workspace selector for a given slug. */
export function selectorForSlug(slug: string): string {
  return `[data-section-id="${slug}"]`;
}
