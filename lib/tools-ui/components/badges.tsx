"use client";

import { Badge } from "../primitives/badge";

/**
 * Track + lifecycle badge composites — thin wrappers over <Badge> that
 * encode the marketplace's track/lifecycle vocabularies as semantic tone
 * choices. Use these in cards / spec rows / curator surfaces; reach for
 * <Badge> directly only when the tone isn't track or lifecycle.
 */

export type TrackName = "stable" | "experimental" | "legacy";
export type LifecycleName =
  | "Local"
  | "Draft"
  | "Submitted"
  | "InReview"
  | "Approved"
  | "Promoted"
  | "Deprecated"
  | "Archived";

const trackTone: Record<TrackName, "track-stable" | "track-experimental" | "track-legacy"> = {
  stable: "track-stable",
  experimental: "track-experimental",
  legacy: "track-legacy",
};

export function TrackBadge({ track, children }: { track: TrackName; children?: React.ReactNode }) {
  return (
    <Badge tone={trackTone[track]} dotColor={`var(--mr-track-${track})`}>
      {children ?? track}
    </Badge>
  );
}

export function LifecycleBadge({
  lifecycle,
  label,
}: {
  lifecycle: LifecycleName;
  label?: string;
}) {
  const slug = lifecycle.toLowerCase();
  return (
    <Badge tone="lifecycle" dotColor={`var(--mr-lifecycle-${slug})`}>
      {label ?? lifecycle}
    </Badge>
  );
}
