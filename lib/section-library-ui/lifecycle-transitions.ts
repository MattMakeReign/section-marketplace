/**
 * Lifecycle state machine for sections.
 *
 * Defines the valid transitions from each state, the user-facing label for
 * each transition, and a "kind" (forward / backward / sidetrack) so the UI
 * can group them visually without hardcoding state names in the modal.
 *
 * Shape kept tiny on purpose — this is the single source of truth used by
 * both the Library App's curator action bar and (later) the future workspace
 * curation surface.
 */

import type { Lifecycle } from "./types";

export type TransitionKind = "forward" | "backward" | "sidetrack" | "restore";

export type Transition = {
  /** Target lifecycle state. */
  to: Lifecycle;
  /** Verb shown on the action button. */
  label: string;
  /** How to group/style this transition in the action bar. */
  kind: TransitionKind;
  /** Optional one-line tooltip explaining what the transition means. */
  hint?: string;
};

/**
 * Forward path: Submitted → InReview → Approved → Promoted.
 *
 * From Promoted a section can be Deprecated (still findable, discouraged) or
 * Archived (hidden from catalogue). Anything past Submitted can be Archived.
 * Reverse path at every forward step lets a curator kick a section back.
 */
export const TRANSITIONS: Record<Lifecycle, Transition[]> = {
  Local: [],
  Draft: [],

  Submitted: [
    { to: "InReview", label: "Start review", kind: "forward", hint: "Move into the curation queue" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Hide from the catalogue" },
  ],

  InReview: [
    { to: "Approved", label: "Approve", kind: "forward", hint: "Metadata is ready — clear for promotion" },
    { to: "Submitted", label: "Send back", kind: "backward", hint: "Return to the submitter for fixes" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Hide from the catalogue" },
  ],

  Approved: [
    { to: "Promoted", label: "Promote", kind: "forward", hint: "Make the section publicly visible in the catalogue" },
    { to: "InReview", label: "Re-review", kind: "backward", hint: "Send back into the review queue" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Hide from the catalogue" },
  ],

  Promoted: [
    { to: "Deprecated", label: "Deprecate", kind: "sidetrack", hint: "Still findable, discouraged for new work" },
    { to: "Approved", label: "Unpromote", kind: "backward", hint: "Remove from public view, return to approved pool" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Hide from the catalogue" },
  ],

  Deprecated: [
    { to: "Promoted", label: "Restore", kind: "restore", hint: "Return to active promoted status" },
    { to: "Archived", label: "Archive", kind: "sidetrack", hint: "Hide from the catalogue" },
  ],

  Archived: [
    { to: "Submitted", label: "Unarchive", kind: "restore", hint: "Return to the review queue" },
  ],
};

/**
 * Return the ordered list of transitions available from a given state.
 * The Library App's action bar renders these left-to-right in this order.
 */
export function transitionsFrom(state: Lifecycle): Transition[] {
  return TRANSITIONS[state] ?? [];
}

/**
 * Validate a requested transition. Used by the API route as a server-side
 * guard so a curator can't write an arbitrary lifecycle value by hand-rolling
 * a request.
 */
export function isValidTransition(from: Lifecycle, to: Lifecycle): boolean {
  return transitionsFrom(from).some((t) => t.to === to);
}
