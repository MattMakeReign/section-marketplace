/**
 * Controlled vocabularies for the curation enrichment form.
 *
 * These are v1 seed lists. They will drift as curation surfaces what's
 * missing — treat them as a starting point, not a ceiling. New values added
 * to a section's `curation` arrays via the form get round-tripped through
 * `section.json` even if not in this list; the lists drive the *suggestion*
 * UI (chips), not the schema's hard validation set.
 *
 * Naming rule across all of these: short kebab-case strings. Plural-form
 * fields hold these as arrays; singular-form fields hold one of them.
 */

import type { Curation } from "./types";

/* ─────────────────────────── Page-fit ─────────────────────────── */

/** Page types where a section layout naturally fits. */
export const PAGE_TYPES = [
  "landing",
  "about",
  "services",
  "products",
  "case-study",
  "blog-listing",
  "blog-post",
  "contact",
  "pricing",
  "team",
  "process",
] as const;

/* ─────────────────────────── Tonal affordances ─────────────────────────── */

/**
 * Tones the layout *can credibly carry* — not "is". Plural by intent.
 * A layout that only carries one tone is over-specified.
 */
export const TONAL_AFFORDANCES = [
  "editorial",
  "premium",
  "minimal",
  "maximalist",
  "warm",
  "cool",
  "playful",
  "technical",
  "restrained",
  "expressive",
] as const;

/* ─────────────────────────── Layout properties ─────────────────────────── */

export const VISUAL_DENSITIES = ["airy", "balanced", "dense"] as const;
export const IMAGERY_DEPENDENCE = ["required", "optional", "none"] as const;
export const COPY_DENSITIES = ["tight", "balanced", "verbose"] as const;

/* ─────────────────────────── Structural slots ─────────────────────────── */

/**
 * Common named slots a layout might expose. The form suggests these but the
 * curator can add ad-hoc slot names — sections are diverse.
 */
export const STRUCTURAL_SLOTS = [
  "eyebrow",
  "h1",
  "h2",
  "subtitle",
  "body",
  "cta-primary",
  "cta-secondary",
  "image-hero",
  "image-grid",
  "image-marquee",
  "card-grid",
  "tab-nav",
  "quote-pull",
  "logo-grid",
  "stat-grid",
  "video",
  "form",
  "list-bullets",
  "list-numbered",
  "manifesto-block",
] as const;

/* ─────────────────────────── Curation gating ─────────────────────────── */

/**
 * Minimum fields required before a section is allowed to leave InReview
 * for Approved. Surfaces in the enrichment form as a completion checklist
 * and gates the Approve action in the curator bar.
 *
 * Conservative on purpose — we want richness, but we want it CONSISTENT.
 */
export const APPROVAL_REQUIRED_FIELDS: Array<keyof Curation> = [
  "intent",
  "structuralPattern",
  "structuralSlots",
  "pageTypes",
  "tonalAffordances",
  "visualDensity",
  "imageryDependence",
  "copyDensity",
];

/**
 * Return the list of required curation fields a section is still missing.
 * Used by the enrichment form's completion checklist + the Approve gate.
 */
export function missingForApproval(curation: Curation | undefined): string[] {
  const c = curation ?? {};
  return APPROVAL_REQUIRED_FIELDS.filter((field) => {
    const value = c[field];
    if (Array.isArray(value)) return value.length === 0;
    return value == null || value === "";
  }) as string[];
}

/* ─────────────────────────── README prose sections ─────────────────────────── */

/**
 * Named markdown sections that the curator owns inside `README.md`.
 * The save endpoint round-trips these by H2 heading; everything else in the
 * README is preserved untouched.
 */
export const README_PROSE_SECTIONS = [
  { key: "whenToUse", heading: "When to use", help: "Positive case — when does this layout earn its place?" },
  { key: "whenNotToUse", heading: "When NOT to use", help: "Negative case — equally important. Tells AI when to reject." },
  { key: "adaptationNotes", heading: "Adaptation notes", help: "What an AI should tweak per project, what should stay structural." },
  { key: "failureModes", heading: "Failure modes", help: "Known edge cases — e.g. 'breaks past 8-word H1'." },
] as const;

export type ReadmeProseKey = (typeof README_PROSE_SECTIONS)[number]["key"];
export type ProseSections = Partial<Record<ReadmeProseKey, string>>;
