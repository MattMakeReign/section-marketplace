/**
 * Shared types for the Section Library — used by both the standalone App and
 * the in-builder Preview Tool. Mirror the marketplace `section.json` shape.
 */

export type Track = "stable" | "experimental" | "legacy";

export type Lifecycle =
  | "Local"
  | "Draft"
  | "Submitted"
  | "InReview"
  | "Approved"
  | "Promoted"
  | "Deprecated"
  | "Archived";

export type Attribution = {
  originalCreator?: string;
  originatingProject?: string;
  submittedAt?: string;
  promotedAt?: string;
};

/**
 * Curator-authored AI-legibility metadata. Populated during the review pass.
 * Describes the layout, not the brand. An AI given a project brief uses these
 * signals to pick or reject a section, then adapts it to the project's tokens.
 */
export type Curation = {
  /** Single-line structural intent — what the section IS, beyond `category`. */
  intent?: string;
  /** Short layout shape descriptor (e.g. "split-2col: text-left, image-right"). */
  structuralPattern?: string;
  /** Named content slots the layout exposes. */
  structuralSlots?: string[];
  /** Page types where the layout fits naturally. */
  pageTypes?: string[];
  /** Tones the layout CAN credibly carry (plural by definition). */
  tonalAffordances?: string[];
  visualDensity?: "airy" | "balanced" | "dense";
  imageryDependence?: "required" | "optional" | "none";
  copyDensity?: "tight" | "balanced" | "verbose";
  composition?: {
    pairsAbove?: string[];
    pairsBelow?: string[];
    antiPairs?: string[];
  };
};

export type ManifestEntry = {
  id: string;
  name: string;
  category: string;
  version: string;
  track?: Track;
  lifecycle?: Lifecycle;
  description?: string;
  tags?: string[];
  motionDensity?: string[];
  responsive?: { profile?: string; breakpoints?: string[]; notes?: string };
  dependencies?: string[];
  previews?: { static?: string; live?: boolean };
  path?: string;
  created?: string;
  updated?: string;
  submittedBy?: string;
  attribution?: Attribution;
  curation?: Curation;
};

export type Manifest = {
  generated?: string;
  count?: number;
  sections?: ManifestEntry[];
};

/**
 * Lifecycle states that surface as filter pill options.
 * `Local` + `Draft` are pre-submission states excluded by design.
 */
export const LIFECYCLES: Lifecycle[] = [
  "Submitted",
  "InReview",
  "Approved",
  "Promoted",
  "Deprecated",
  "Archived",
];

export const TRACKS: Track[] = ["stable", "experimental", "legacy"];

/** Sections without an explicit lifecycle are treated as `Promoted` — legacy default. */
export function getLifecycle(s: ManifestEntry): Lifecycle {
  return s.lifecycle ?? "Promoted";
}

/** "InReview" → "In Review"; everything else passes through. */
export function lifecycleLabel(l: Lifecycle): string {
  return l === "InReview" ? "In Review" : l;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
