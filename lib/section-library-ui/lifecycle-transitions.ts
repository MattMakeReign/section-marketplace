/**
 * Lifecycle state machine for sections.
 *
 * Collapsed to 3 states in promotion-system-v2 (2026-05-19):
 * Submitted → Approved → Archived. Mirror of @mr/section-library-ui's
 * lifecycle-transitions, vendored here because the marketplace aliases
 * `@mr/section-library-ui` to this local lib/ folder.
 */

import type { Lifecycle } from "./types";

export type TransitionKind = "forward" | "backward" | "sidetrack" | "restore";

export type Transition = {
  to: Lifecycle;
  label: string;
  kind: TransitionKind;
  hint?: string;
};

export const TRANSITIONS: Partial<Record<Lifecycle, Transition[]>> = {
  Submitted: [
    { to: "Approved", label: "Approve", kind: "forward", hint: "Make this section accessible in the catalogue" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Remove from the catalogue" },
  ],

  Approved: [
    { to: "Submitted", label: "Unapprove", kind: "backward", hint: "Send back to the review queue" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Remove from the catalogue" },
  ],

  Archived: [
    { to: "Submitted", label: "Unarchive", kind: "restore", hint: "Return to the review queue" },
  ],
};

export function transitionsFrom(state: Lifecycle): Transition[] {
  const folded = foldLegacy(state);
  return TRANSITIONS[folded] ?? [];
}

export function isValidTransition(from: Lifecycle, to: Lifecycle): boolean {
  return transitionsFrom(from).some((t) => t.to === to);
}

function foldLegacy(s: Lifecycle): Lifecycle {
  if (s === "Promoted") return "Approved";
  if (s === "InReview") return "Submitted";
  if (s === "Deprecated") return "Archived";
  if (s === "Local" || s === "Draft") return "Submitted";
  return s;
}
