/**
 * Approval gating for the section lifecycle.
 *
 * Slimmed in promotion-system-v2 (2026-05-19). Was: 8 curator fields + 9 vocab
 * lists + 4 prose-section keys. Now: 3-field gate on description + tags +
 * preview PNG. The vision-capable AI that picks sections for a brief reads
 * description + tags + preview directly — no text-encoded structural metadata.
 */

import type { ManifestEntry } from "./types";

export const APPROVAL_REQUIRED_FIELDS = ["description", "tags", "previews.static"] as const;

export type ApprovalRequiredField = (typeof APPROVAL_REQUIRED_FIELDS)[number];

export function missingForApproval(section: ManifestEntry | undefined): ApprovalRequiredField[] {
  const s = section ?? ({} as ManifestEntry);
  const missing: ApprovalRequiredField[] = [];
  if (!s.description || s.description.trim().length < 20) missing.push("description");
  if (!Array.isArray(s.tags) || s.tags.length === 0) missing.push("tags");
  if (!s.previews?.static || s.previews.static.trim().length === 0) missing.push("previews.static");
  return missing;
}

export const APPROVAL_FIELD_LABELS: Record<ApprovalRequiredField, string> = {
  description: "Description (at least 20 characters)",
  tags: "At least one tag",
  "previews.static": "Preview image (PNG)",
};
