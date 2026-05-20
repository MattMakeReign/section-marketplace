"use client";

import { type ReactNode } from "react";
import { Card } from "../primitives/card";
import { Badge } from "../primitives/badge";
import { TrackBadge, LifecycleBadge, type TrackName, type LifecycleName } from "./badges";

/**
 * SectionCard — preview thumbnail + name + badge row for a marketplace
 * section. Two modes:
 *   - clickable (App): whole card opens the detail page on click
 *   - with-cta (Preview Tool): card is a plain container, cta owns the click
 */

export type SectionCardSummary = {
  id: string;
  name: string;
  category: string;
  version: string;
  track?: string;
};

export function SectionCard({
  section,
  lifecycle,
  previewSrc,
  videoSrc,
  onOpen,
  cta,
  showLifecycle = true,
}: {
  section: SectionCardSummary;
  /** Optional — when omitted (or showLifecycle=false), no lifecycle badge renders. */
  lifecycle?: LifecycleName;
  previewSrc?: string;
  videoSrc?: string;
  onOpen?: () => void;
  cta?: ReactNode;
  showLifecycle?: boolean;
}) {
  const track = ((section.track ?? "stable") as TrackName);

  const inner = (
    <>
      <div className="mr-section-card__window">
        <div className="mr-section-card__viewport">
          {previewSrc ? (
            <img src={previewSrc} alt="" loading="lazy" />
          ) : (
            <span className="mr-section-card__fallback">{section.id}</span>
          )}
          {videoSrc ? (
            <video
              className="mr-section-card__video"
              src={videoSrc}
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
              onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
          ) : null}
        </div>
      </div>
      <div className="mr-section-card__body">
        <span className="mr-section-card__name">{section.name}</span>
        <div className="mr-section-card__badges">
          <Badge>{section.category}</Badge>
          <TrackBadge track={track} />
          {showLifecycle && lifecycle ? <LifecycleBadge lifecycle={lifecycle} /> : null}
          <Badge>v{section.version}</Badge>
        </div>
        {cta ? <div className="mr-section-card__cta">{cta}</div> : null}
      </div>
    </>
  );

  if (cta) {
    return (
      <article className="mr-section-card-wrapper">
        <Card className="mr-section-card mr-section-card--with-cta">{inner}</Card>
      </article>
    );
  }

  return (
    <article className="mr-section-card-wrapper">
      <button
        type="button"
        className="mr-section-card mr-section-card--clickable"
        onClick={onOpen}
        aria-label={`Open ${section.name}`}
      >
        {inner}
      </button>
    </article>
  );
}
