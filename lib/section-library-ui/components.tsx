"use client";

/**
 * Shared presentational components for the Section Library. Both the
 * standalone App and the in-builder Preview Tool render these so the
 * two surfaces look identical and stay in lockstep.
 *
 * Components avoid any data-fetching opinions — callers pass:
 *   - `previewSrc` to <SectionCard> (the App uses `/preview/<id>`; the
 *     Preview Tool inlines blob/data URLs from the local agent).
 *   - The list of sections + filter state from above.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  getLifecycle,
  lifecycleLabel,
  capitalize,
  type ManifestEntry,
  type Track,
  type Lifecycle,
} from "./types";
import { IconChevronDown } from "./icons";

/* ─────────────────────────── FilterPill ─────────────────────────── */

export type FilterOption = {
  id: string;
  label: string;
  count?: number;
  dot?: string;
};

export function FilterPill({
  label,
  icon,
  value,
  options,
  onChange,
  defaultLabel,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (id: string) => void;
  defaultLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allId = defaultLabel ?? "all";
  const isActive = value !== allId && options.some((o) => o.id === value && o.id !== allId);
  const activeLabel = options.find((o) => o.id === value)?.label ?? label;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className={`mr-sl-pill${isActive ? " mr-sl-pill--active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mr-sl-pill__icon">{icon}</span>
        <span>{isActive ? activeLabel : label}</span>
        <IconChevronDown size={12} />
      </button>
      {open ? (
        <div className="mr-sl-pop" role="listbox">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`mr-sl-pop__item${value === o.id ? " mr-sl-pop__item--active" : ""}`}
              onClick={() => { onChange(o.id); setOpen(false); }}
              role="option"
              aria-selected={value === o.id}
            >
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                {o.dot ? <span className="mr-sl-pop__dot" style={{ ["--dot" as string]: o.dot }} /> : null}
                {o.label}
              </span>
              {typeof o.count === "number" ? <span className="mr-sl-pop__item-meta">{o.count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── SectionCard ─────────────────────────── */

export function SectionCard({
  section,
  previewSrc,
  onOpen,
  brand = "MakeReign",
  cta,
  showLifecycle = true,
}: {
  section: ManifestEntry;
  /** URL for the static preview image. Caller's choice: HTTP route, blob:, data:, … */
  previewSrc?: string;
  /** Click handler for the card body. The App opens the Detail modal. Ignored when `cta` is given. */
  onOpen?: () => void;
  /** Optional override for the brand line (defaults to "MakeReign"). */
  brand?: string;
  /**
   * Optional action element rendered inside the card body, below the badges.
   * The Preview Tool uses this for "Add section". When present, the card itself
   * is a plain `<div>` (no outer click) so the CTA is the single interactive
   * affordance — and nested-button DOM stays valid.
   */
  cta?: ReactNode;
  /** App shows lifecycle in the badge row; Preview Tool hides it (curation-only). */
  showLifecycle?: boolean;
}) {
  const sectionTrack = (section.track ?? "stable") as Track;
  const sectionLifecycle = getLifecycle(section);

  const inner = (
    <>
      <div className="mr-sl-card__window">
        <div className="mr-sl-card__viewport">
          {previewSrc ? (
            <img src={previewSrc} alt="" loading="lazy" />
          ) : (
            <span className="mr-sl-card__fallback">{section.id}</span>
          )}
        </div>
      </div>
      <div className="mr-sl-card__body">
        <span className="mr-sl-card__name">{section.name}</span>
        <span className="mr-sl-card__brand">
          <span className="mr-sl-card__brand-mark" aria-hidden>MR</span>
          {brand}{section.submittedBy ? ` · ${section.submittedBy}` : " · core"}
        </span>
        <div className="mr-sl-badge-row">
          <span className="mr-sl-badge">{section.category}</span>
          <span className="mr-sl-badge" data-track={sectionTrack}>
            <span className="mr-sl-badge__dot" />
            {sectionTrack}
          </span>
          {showLifecycle ? (
            <span className="mr-sl-badge" data-lifecycle={sectionLifecycle}>
              <span className="mr-sl-badge__dot" />
              {lifecycleLabel(sectionLifecycle)}
            </span>
          ) : null}
          <span className="mr-sl-badge">v{section.version}</span>
        </div>
        {cta ? <div className="mr-sl-card__cta">{cta}</div> : null}
      </div>
    </>
  );

  // Preview Tool mode: card is a plain container; CTA owns the click.
  if (cta) {
    return (
      <article className="mr-sl-card-wrapper">
        <div className="mr-sl-card mr-sl-card--with-cta">{inner}</div>
      </article>
    );
  }

  // App mode: whole card is the click target (opens Detail modal).
  return (
    <article className="mr-sl-card-wrapper">
      <button
        type="button"
        className="mr-sl-card"
        onClick={onOpen}
        aria-label={`Open ${section.name}`}
      >
        {inner}
      </button>
    </article>
  );
}

/* ─────────────────────────── Spec rows (modal Specs tab) ─────────────────────────── */

export function Spec({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mr-sl-spec">
      <span className="mr-sl-spec__label">{label}</span>
      <span className="mr-sl-spec__value">{value}</span>
    </div>
  );
}

