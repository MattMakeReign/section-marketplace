"use client";

/**
 * <Detail /> — full-viewport section preview page.
 *
 * Layout shape:
 *   - Light page ground around the edges (inset margin)
 *   - White rounded "stage" centered in the viewport, holding the iframe
 *     preview at `/render/<id>` as the page's centrepiece
 *   - Floating top-left breadcrumb pill
 *   - Floating top-right 4-icon toolbar (info · refresh · code · close)
 *   - Left drawer (hidden by default) — section info, specs, curator actions
 *   - Right drawer (hidden by default) — install command
 *
 * Drawer state persists in localStorage so the user's chosen layout sticks
 * across navigation. Both drawers can be open simultaneously.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  capitalize,
  getLifecycle,
  lifecycleLabel,
  missingForApproval,
  transitionsFrom,
  type Lifecycle,
  type ManifestEntry,
  type Track,
  type Transition,
} from "@mr/section-library-ui";

type Viewport = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 390,
};

/**
 * useSlide — drives an element's inline styles via Web Animations API
 * so the open/close transition fires reliably regardless of React
 * batching. CSS transitions were getting stuck at the start frame
 * because React's synchronous state update didn't leave the browser a
 * paint window to snapshot the "before" value.
 *
 * - First mount: snaps to the initial state (no animation).
 * - Subsequent `open` flips: animates from current → target.
 * - Any in-flight animation gets committed + cancelled so re-toggles
 *   pick up the current visual position, not the previous endpoint.
 */
const SLIDE_TIMING: KeyframeAnimationOptions = {
  duration: 320,
  easing: "cubic-bezier(0.32, 0.72, 0, 1)",
  fill: "forwards",
};
// Drawer endpoints — closed parks fully off-screen left + 12px clearance
// so the shadow doesn't peek past the page-ground edge.
const DRAWER_OPEN_STYLES = { transform: "translateX(0)", opacity: "1" };
const DRAWER_CLOSED_STYLES = { transform: "translateX(calc(-100% - 12px))", opacity: "0" };
// Stage endpoints — open shifts its left edge inward by drawer-width
// + 12px hairline gap so the drawer + stage form a unified pair.
const STAGE_OPEN_STYLES = { left: "344px" };
const STAGE_CLOSED_STYLES = { left: "6px" };
function useSlide<T extends HTMLElement>(
  open: boolean,
  openStyles: Record<string, string>,
  closedStyles: Record<string, string>,
) {
  const ref = useRef<T>(null);
  const prev = useRef<boolean | null>(null);
  const anim = useRef<Animation | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = open ? openStyles : closedStyles;
    if (prev.current === null) {
      // First render — snap to initial state without animation.
      for (const k in target) (el.style as Record<string, string>)[k] = target[k];
      prev.current = open;
      return;
    }
    if (prev.current === open) return;
    prev.current = open;
    // Commit any in-flight animation so the "from" state below uses
    // the current visual position, then cancel it before starting a
    // new one (prevents the new animation snapping past the old).
    if (anim.current) {
      try { anim.current.commitStyles(); } catch { /* not yet running */ }
      anim.current.cancel();
    }
    const from = open ? closedStyles : openStyles;
    anim.current = el.animate([from, target], SLIDE_TIMING);
    for (const k in target) (el.style as Record<string, string>)[k] = target[k];
  }, [open, openStyles, closedStyles]);
  return ref;
}

export function Detail({
  section,
  order,
  curatorMode,
}: {
  section: ManifestEntry;
  order: string[];
  curatorMode: boolean;
}) {
  const router = useRouter();

  // Single-panel state — only one drawer open at a time. Both drawers
  // slide in from the left; toggling one closes the other.
  //
  // State is mirrored in the URL (`?panel=info|install`) so that prev/
  // next navigation between detail pages preserves the open drawer,
  // but arriving fresh from the listing page (where the link has no
  // panel param) defaults to full-screen.
  type Panel = "info" | "install" | null;
  const searchParams = useSearchParams();
  const urlPanel = searchParams?.get("panel");
  const initialPanel: Panel =
    urlPanel === "info" || urlPanel === "install" ? urlPanel : null;
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const togglePanel = (p: Exclude<Panel, null>) =>
    setPanel((cur) => (cur === p ? null : p));
  const leftOpen = panel === "info";
  const rightOpen = panel === "install";
  const panelOpen = panel !== null;

  // Live overlay for curator-mutated sections, so transition clicks
  // reflect immediately without waiting for the server-component refresh.
  const [overlay, setOverlay] = useState<ManifestEntry | null>(null);
  const current = overlay ?? section;
  useEffect(() => { setOverlay(null); }, [section.id]);

  // Prev / next navigation through the manifest order.
  const idx = order.indexOf(current.id);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const goTo = (id: string) => {
    // Carry the open drawer across prev/next navigation so the user's
    // current layout persists. Curator mode also rides along.
    const params = new URLSearchParams();
    if (curatorMode) params.set("mode", "curate");
    if (panel) params.set("panel", panel);
    const qs = params.toString();
    router.push(`/sections/${id}${qs ? `?${qs}` : ""}`);
  };

  // Iframe sizing model.
  //
  // - Desktop: the iframe fills 100% of the stage. The section inside
  //   sees the REAL stage width as its viewport and reflows responsively
  //   on every resize. No scaling, no fixed 1440 viewport.
  // - Tablet/Mobile: the iframe renders at the device's pixel width
  //   (768/390) and scales DOWN (capped at 1) to fit the stage — gives
  //   a device-frame preview with breathing room on a wide stage.
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [iframeKey, setIframeKey] = useState(0);
  useEffect(() => {
    if (viewport === "desktop") {
      setScale(1);
      return;
    }
    const frame = frameRef.current;
    if (!frame) return;
    const targetW = DEVICE_WIDTH[viewport];
    const update = () => {
      const available = frame.clientWidth;
      setScale(Math.min(1, available / targetW));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(frame);
    return () => obs.disconnect();
  }, [viewport]);

  // Keyboard nav — Escape closes, arrow keys walk between sections.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(curatorMode ? "/?mode=curate" : "/");
      else if (e.key === "ArrowLeft" && prevId) goTo(prevId);
      else if (e.key === "ArrowRight" && nextId) goTo(nextId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevId, nextId, curatorMode]);

  const isDesktop = viewport === "desktop";

  // Stage slides its left edge between 6px (full-screen) and 344px
  // (when a drawer is open). WAAPI-driven so the transition fires
  // reliably; see useSlide for why CSS transitions weren't viable.
  const stageRef = useSlide<HTMLDivElement>(
    panelOpen,
    STAGE_OPEN_STYLES,
    STAGE_CLOSED_STYLES,
  );

  return (
    <div className="mr-mk-detail">
      {/* The stage — full bleed inside the inset; iframe lives here.
       * Stage pulls inward whenever ANY panel is open (single offset). */}
      <div ref={stageRef} className="mr-mk-detail__stage" data-panel-open={panelOpen}>
        <div className="mr-mk-detail__frame" ref={frameRef}>
          <iframe
            key={`${current.id}-${viewport}-${iframeKey}`}
            src={`/render/${current.id}`}
            title={`${current.name} preview`}
            className="mr-mk-detail__iframe"
            style={{
              width: isDesktop ? "100%" : `${DEVICE_WIDTH[viewport]}px`,
              height: isDesktop ? "100%" : `${100 / scale}%`,
              transform: isDesktop ? "none" : `scale(${scale})`,
            } as CSSProperties}
          />
        </div>
        {/* Prev/next pager lives INSIDE the stage so its centre tracks
         * the stage's animated left edge — when a drawer opens, the
         * pager shifts with the stage instead of staying glued to the
         * viewport centre. */}
        {(prevId || nextId) && (
          <div className="mr-mk-detail__pager">
            <button
              type="button"
              className="mr-mk-detail__pager-btn"
              onClick={() => prevId && goTo(prevId)}
              disabled={!prevId}
              aria-label="Previous section"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="mr-mk-detail__pager-count">
              {idx + 1} / {order.length}
            </span>
            <button
              type="button"
              className="mr-mk-detail__pager-btn"
              onClick={() => nextId && goTo(nextId)}
              disabled={!nextId}
              aria-label="Next section"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Top-left breadcrumb pill — hidden when ANY drawer is open,
       * since the drawer takes the top-left chrome slot and the pill
       * would otherwise overlap its header. */}
      {!panelOpen && (
        <div className="mr-mk-detail__breadcrumb">
          <Link
            href={curatorMode ? "/?mode=curate" : "/"}
            className="mr-mk-detail__crumb mr-mk-detail__crumb--link"
            aria-label="Back to library"
          >
            Sections
          </Link>
          <span className="mr-mk-detail__crumb-sep">·</span>
          <span className="mr-mk-detail__crumb">{capitalize(current.category)}</span>
          <span className="mr-mk-detail__crumb-sep">·</span>
          <span className="mr-mk-detail__crumb mr-mk-detail__crumb--active">{current.name}</span>
        </div>
      )}

      {/* Top-right 4-icon floating toolbar */}
      <div className="mr-mk-detail__toolbar" role="toolbar" aria-label="Section actions">
        <button
          type="button"
          className={`mr-mk-detail__tool${leftOpen ? " mr-mk-detail__tool--active" : ""}`}
          aria-pressed={leftOpen}
          aria-label="Info & specs"
          title="Info & specs"
          onClick={() => togglePanel("info")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="6" y1="3" x2="6" y2="13" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button
          type="button"
          className={`mr-mk-detail__tool${rightOpen ? " mr-mk-detail__tool--active" : ""}`}
          aria-pressed={rightOpen}
          aria-label="Install command"
          title="Install command"
          onClick={() => togglePanel("install")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 5L3 8l3 3M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className="mr-mk-detail__tool"
          aria-label="Reload preview"
          title="Reload preview"
          onClick={() => setIframeKey((k) => k + 1)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8a5 5 0 018.5-3.5L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M13 3v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 8a5 5 0 01-8.5 3.5L3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M3 13v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Link
          href={curatorMode ? "/?mode=curate" : "/"}
          className="mr-mk-detail__tool"
          aria-label="Close"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      {/* Both drawers share the left-side slot — only one open at a
       * time (mutually exclusive via panel state). Always mounted so
       * the slide transition has both endpoints to interpolate. */}
      <LeftDrawer
        section={current}
        curatorMode={curatorMode}
        viewport={viewport}
        onViewport={setViewport}
        onSectionUpdate={setOverlay}
        onClose={() => setPanel(null)}
        open={leftOpen}
      />
      <RightDrawer section={current} onClose={() => setPanel(null)} open={rightOpen} />
    </div>
  );
}

/* ─────────────────────────── LeftDrawer ─────────────────────────── */

function LeftDrawer({
  section,
  curatorMode,
  viewport,
  onViewport,
  onSectionUpdate,
  onClose,
  open,
}: {
  section: ManifestEntry;
  curatorMode: boolean;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onSectionUpdate: (s: ManifestEntry) => void;
  onClose: () => void;
  open: boolean;
}) {
  const sectionTrack = (section.track ?? "stable") as Track;
  const sectionLifecycle = getLifecycle(section);
  const ref = useSlide<HTMLElement>(open, DRAWER_OPEN_STYLES, DRAWER_CLOSED_STYLES);

  return (
    <aside
      ref={ref}
      className="mr-mk-detail__drawer mr-mk-detail__drawer--left"
      data-open={open}
      aria-hidden={!open}
      aria-label="Section info"
    >
      <header className="mr-mk-detail__drawer-head">
        <div className="mr-mk-detail__drawer-eyebrow">Section</div>
        <h1 className="mr-mk-detail__drawer-title">{section.name}</h1>
        <button
          type="button"
          className="mr-mk-detail__drawer-close"
          onClick={onClose}
          aria-label="Close info"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {section.description ? (
        <p className="mr-mk-detail__drawer-desc">{section.description}</p>
      ) : null}

      {section.tags?.length ? (
        <div className="mr-mk-detail__tags">
          {section.tags.map((t) => (
            <span key={t} className="mr-mk-detail__tag">{t}</span>
          ))}
        </div>
      ) : null}

      <div className="mr-mk-detail__drawer-section">
        <div className="mr-mk-detail__drawer-section-label">Viewport</div>
        <div className="mr-mk-detail__viewport-toggle" role="radiogroup" aria-label="Preview viewport">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={viewport === v}
              className={`mr-mk-detail__viewport-btn${viewport === v ? " mr-mk-detail__viewport-btn--active" : ""}`}
              onClick={() => onViewport(v)}
            >
              {capitalize(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="mr-mk-detail__drawer-section">
        <div className="mr-mk-detail__drawer-section-label">Specs</div>
        <dl className="mr-mk-detail__specs">
          <SpecRow label="Category" value={capitalize(section.category)} />
          <SpecRow label="Version" value={`v${section.version}`} />
          <SpecRow
            label="Track"
            value={
              <span className="mr-sl-badge" data-track={sectionTrack}>
                <span className="mr-sl-badge__dot" />
                {sectionTrack}
              </span>
            }
          />
          <SpecRow
            label="Lifecycle"
            value={
              <span className="mr-sl-badge" data-lifecycle={sectionLifecycle}>
                <span className="mr-sl-badge__dot" />
                {lifecycleLabel(sectionLifecycle)}
              </span>
            }
          />
          {section.motionDensity?.length ? (
            <SpecRow label="Motion" value={section.motionDensity.join(" · ")} />
          ) : null}
          {section.responsive?.profile ? (
            <SpecRow label="Responsive" value={section.responsive.profile} />
          ) : null}
          {section.attribution?.originatingProject ? (
            <SpecRow label="Origin" value={section.attribution.originatingProject} />
          ) : null}
          {section.attribution?.submittedAt ? (
            <SpecRow label="Submitted" value={section.attribution.submittedAt} />
          ) : null}
          {section.attribution?.promotedAt ? (
            <SpecRow label="Promoted" value={section.attribution.promotedAt} />
          ) : null}
        </dl>
      </div>

      {curatorMode ? (
        <div className="mr-mk-detail__drawer-section">
          <div className="mr-mk-detail__drawer-section-label">Curator</div>
          <CuratorActions section={section} onSectionUpdate={onSectionUpdate} />
        </div>
      ) : null}
    </aside>
  );
}

/* ─────────────────────────── RightDrawer ─────────────────────────── */

function RightDrawer({ section, onClose, open }: { section: ManifestEntry; onClose: () => void; open: boolean }) {
  const [copied, setCopied] = useState(false);
  const installCmd = `mr add ${section.id}`;
  const ref = useSlide<HTMLElement>(open, DRAWER_OPEN_STYLES, DRAWER_CLOSED_STYLES);

  async function copy() {
    try {
      await navigator.clipboard.writeText(installCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silent
    }
  }

  return (
    <aside
      ref={ref}
      className="mr-mk-detail__drawer mr-mk-detail__drawer--right"
      data-open={open}
      aria-hidden={!open}
      aria-label="Install"
    >
      <header className="mr-mk-detail__drawer-head">
        <div className="mr-mk-detail__drawer-eyebrow">Install</div>
        <h2 className="mr-mk-detail__drawer-title">Add to project</h2>
        <button
          type="button"
          className="mr-mk-detail__drawer-close"
          onClick={onClose}
          aria-label="Close install"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <p className="mr-mk-detail__drawer-desc">
        Run this from any MakeReign project root. The section's files stream from the API and land
        in your local `sections/` directory.
      </p>

      <div className="mr-mk-detail__install">
        <code>{installCmd}</code>
        <button type="button" className="mr-mk-detail__install-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mr-mk-detail__drawer-section">
        <div className="mr-mk-detail__drawer-section-label">Section ID</div>
        <code className="mr-mk-detail__codeline">{section.id}</code>
      </div>

      <div className="mr-mk-detail__drawer-section">
        <div className="mr-mk-detail__drawer-section-label">Version</div>
        <code className="mr-mk-detail__codeline">v{section.version}</code>
      </div>
    </aside>
  );
}

/* ─────────────────────────── SpecRow ─────────────────────────── */

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mr-mk-detail__spec">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ─────────────────────────── CuratorActions ─────────────────────────── */

/**
 * Lifecycle transition strip. Reads the section's current state, looks up the
 * valid next states from the shared state-machine, and POSTs to the lifecycle
 * API on click. Optimistically writes the response back into the parent's
 * overlay AND fires router.refresh() so the manifest re-flows from the server.
 */
function CuratorActions({
  section,
  onSectionUpdate,
}: {
  section: ManifestEntry;
  onSectionUpdate: (s: ManifestEntry) => void;
}) {
  const router = useRouter();
  const current = getLifecycle(section);
  const transitions = transitionsFrom(current);
  const missing = missingForApproval(section.curation);
  const [busy, setBusy] = useState<Lifecycle | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(t: Transition) {
    setBusy(t.to);
    setError(null);
    try {
      const res = await fetch(`/api/sections/${section.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: t.to }),
      });
      const json = (await res.json()) as
        | { ok: true; section: ManifestEntry }
        | { ok: false; error: string; code: string };
      if (!res.ok || !json.ok) {
        throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
      }
      onSectionUpdate(json.section);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mr-mk-detail__curator">
      {transitions.length === 0 ? (
        <span className="mr-mk-detail__curator-empty">Terminal state — no transitions</span>
      ) : (
        <div className="mr-mk-detail__curator-actions">
          {transitions.map((t) => {
            const gatedByCuration =
              t.to === "Approved" && t.kind === "forward" && missing.length > 0;
            return (
              <button
                key={t.to}
                type="button"
                className={`mr-mk-detail__curator-btn mr-mk-detail__curator-btn--${t.kind}`}
                onClick={() => go(t)}
                disabled={busy !== null || gatedByCuration}
                title={gatedByCuration
                  ? `Curation incomplete — fill in ${missing.length} required field${missing.length === 1 ? "" : "s"} first`
                  : t.hint ?? ""}
              >
                {busy === t.to ? "…" : t.label}
              </button>
            );
          })}
        </div>
      )}
      {(current === "Submitted" || current === "InReview") && missing.length > 0 ? (
        <a
          href={`/sections/${section.id}/edit?mode=curate`}
          className="mr-mk-detail__curator-enrich"
          title={`${missing.length} required field${missing.length === 1 ? "" : "s"} missing`}
        >
          Enrich · {missing.length} left
        </a>
      ) : null}
      {error ? <span className="mr-mk-detail__curator-error" role="alert">{error}</span> : null}
    </div>
  );
}
