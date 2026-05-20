/**
 * Shared types for the Section Library — used by both the standalone App and
 * the in-builder Preview Tool. Mirror the marketplace `section.json` shape.
 */

export type Track = "stable" | "experimental" | "legacy";

/**
 * Section lifecycle states. Collapsed to 3 in promotion-system-v2 (2026-05-19):
 * Submitted (waiting), Approved (live in catalogue), Archived (removed).
 * Legacy values stay in the union so old section.json files validate;
 * `getLifecycle()` folds them to the 3 real states.
 */
export type Lifecycle =
  | "Submitted"
  | "Approved"
  | "Archived"
  // Legacy values — `getLifecycle()` folds these into the three real states.
  | "Local"
  | "Draft"
  | "InReview"
  | "Promoted"
  | "Deprecated";

export type Attribution = {
  originalCreator?: string;
  originatingProject?: string;
  submittedAt?: string;
  /** When the section first reached `Approved`. Replaces `promotedAt`. */
  approvedAt?: string;
  /** Legacy field name (pre-promotion-v2). Same semantic as `approvedAt`. */
  promotedAt?: string;
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
  dependencies?: string[];
  /**
   * Preview media. `static` is the still image (URL or legacy relative path).
   * `video` is an optional short clip (URL only) showcasing motion — uploaded
   * via the curator drop-zone in the marketplace detail page.
   */
  previews?: { static?: string; video?: string; live?: boolean };
  path?: string;
  created?: string;
  updated?: string;
  submittedBy?: string;
  attribution?: Attribution;
};

export type Manifest = {
  generated?: string;
  count?: number;
  sections?: ManifestEntry[];
};

/**
 * The three real lifecycle states. Filter pills, queue groupings, and badge
 * colors iterate over this constant.
 */
export const LIFECYCLES: Lifecycle[] = ["Submitted", "Approved", "Archived"];

export const TRACKS: Track[] = ["stable", "experimental", "legacy"];

/**
 * Resolve a section's effective lifecycle. Folds legacy values into the three
 * real states (Promoted → Approved, InReview → Submitted, Deprecated → Archived).
 */
export function getLifecycle(s: ManifestEntry): Lifecycle {
  const raw = s.lifecycle;
  if (!raw) return "Approved";
  if (raw === "Promoted") return "Approved";
  if (raw === "InReview") return "Submitted";
  if (raw === "Deprecated") return "Archived";
  if (raw === "Local" || raw === "Draft") return "Submitted";
  return raw;
}

export function lifecycleLabel(l: Lifecycle): string {
  if (l === "InReview") return "In Review";
  return l;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
