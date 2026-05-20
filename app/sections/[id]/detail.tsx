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
  APPROVAL_FIELD_LABELS,
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
import {
  TrackBadge,
  LifecycleBadge,
  ViewportToggle,
  Button,
  Textarea,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  ToggleGroup,
  ToggleGroupItem,
  type LifecycleName,
  type TrackName,
} from "@mr/tools-ui";

const MOTION_OPTIONS = ["static", "low", "medium", "high", "experience"] as const;
import type { BrandContextEntry } from "../../marketplace-data";

type Viewport = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 390,
};

/**
 * Resolve a `section.json.context` reference (e.g. "acme-2025" or
 * "acme-2025@1.0.0") into a display label by matching against the
 * `brand-contexts/index.json` list. Returns null for null/empty/_neutral
 * (no badge rendered).
 */
function resolveSectionContext(
  ref: string | null,
  contexts: BrandContextEntry[],
): { id: string; label: string; pinned: string | null } | null {
  if (!ref || ref === "_neutral") return null;
  const at = ref.indexOf("@");
  const id = at === -1 ? ref : ref.slice(0, at);
  const pinned = at === -1 ? null : ref.slice(at + 1);
  const meta = contexts.find((c) => c.id === id);
  return { id, label: meta?.name ?? id, pinned };
}

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
  brandContexts,
}: {
  section: ManifestEntry;
  order: string[];
  brandContexts: BrandContextEntry[];
}) {
  const router = useRouter();

  // Drawer state — info / install / curation share the same left-side slot,
  // mutually exclusive. Default opens info so section context is visible
  // without a click; toolbar buttons toggle from there.
  type Panel = "info" | "install" | "curation" | null;
  const searchParams = useSearchParams();
  const urlPanel = searchParams?.get("panel");
  const initialPanel: Panel =
    urlPanel === "info" || urlPanel === "install" || urlPanel === "curation"
      ? urlPanel
      : urlPanel === "closed"
        ? null
        : "info";
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const togglePanel = (p: Exclude<Panel, null>) =>
    setPanel((cur) => (cur === p ? null : p));
  const leftOpen = panel === "info";
  const rightOpen = panel === "install";
  const curationOpen = panel === "curation";
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
    // Carry the panel state across prev/next navigation so the user's
    // current layout persists — explicitly including the "closed"
    // state, otherwise omitting the param falls through to the
    // default-open behaviour and the drawer pops back open on every
    // arrow press.
    const params = new URLSearchParams();
    params.set("panel", panel ?? "closed");
    router.push(`/sections/${id}?${params.toString()}`);
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
      if (e.key === "Escape") router.push("/");
      else if (e.key === "ArrowLeft" && prevId) goTo(prevId);
      else if (e.key === "ArrowRight" && nextId) goTo(nextId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevId, nextId]);

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
    <div className="mr-mk-detail" data-viewport={viewport}>
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

      {/* Top-left chrome — viewport toggle. Material-blur dark surface
       * family-matched to the top-right toolbar (same top offset so the
       * two clusters sit on one horizontal axis). Shifts right when the
       * drawer opens so it sits clear of the drawer chrome. */}
      <div className="mr-mk-detail__topchrome" data-shift={panelOpen}>
        <ViewportToggle
          value={viewport}
          onChange={(v) => setViewport(v as Viewport)}
          className="mr-mk-detail__viewport-toggle--chrome"
        />
      </div>

      {/* Top-right chrome — 3-icon action bar (Info / Install / Refresh)
       * paired with a standalone circular Close pill. Close lives in its
       * own surface because it's a navigation action (exits the detail
       * view) whereas the others toggle in-view state. */}
      <div className="mr-mk-detail__topright">
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
            className={`mr-mk-detail__tool${curationOpen ? " mr-mk-detail__tool--active" : ""}`}
            aria-pressed={curationOpen}
            aria-label="Curation"
            title="Curation"
            onClick={() => togglePanel("curation")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
        </div>
        <Link
          href="/"
          className="mr-mk-detail__close"
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
        onClose={() => setPanel(null)}
        open={leftOpen}
        brandContexts={brandContexts}
      />
      <RightDrawer section={current} onClose={() => setPanel(null)} open={rightOpen} />
      <CurationDrawer
        section={current}
        onClose={() => setPanel(null)}
        open={curationOpen}
        onSectionUpdate={(updated) => setOverlay(updated)}
      />
    </div>
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
      className="mr-mk-detail__drawer mr-mk-detail__drawer--left"
      data-open={open}
      aria-hidden={!open}
      aria-label="Install command"
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
        Run this from any MakeReign project root. The section&apos;s files stream from the API and land
        in your local <code>sections/</code> directory.
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

/* ─────────────────────────── LeftDrawer ─────────────────────────── */

function LeftDrawer({
  section,
  onClose,
  open,
  brandContexts,
}: {
  section: ManifestEntry;
  onClose: () => void;
  open: boolean;
  brandContexts: BrandContextEntry[];
}) {
  const sectionTrack = (section.track ?? "stable") as Track;
  const sectionLifecycle = getLifecycle(section);
  const ref = useSlide<HTMLElement>(open, DRAWER_OPEN_STYLES, DRAWER_CLOSED_STYLES);

  // Resolve `section.context` (e.g. "acme-2025" or "acme-2025@1.0.0") into
  // the human label from the contexts index. Falls back to the raw id if
  // the contexts index doesn't yet contain a matching entry.
  const sectionContextRef =
    typeof (section as { context?: unknown }).context === "string"
      ? ((section as { context?: string }).context as string)
      : null;
  const contextResolved = resolveSectionContext(sectionContextRef, brandContexts);

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
        <div className="mr-mk-detail__drawer-section-label">Specs</div>
        <dl className="mr-mk-detail__specs">
          <SpecRow label="Category" value={capitalize(section.category)} />
          <SpecRow label="Version" value={`v${section.version}`} />
          {contextResolved ? (
            <SpecRow
              label="Brand context"
              value={
                <span
                  className="mr-sl-badge"
                  data-context={contextResolved.id}
                  title={
                    contextResolved.pinned
                      ? `Pinned to v${contextResolved.pinned}`
                      : "Floats to latest"
                  }
                >
                  <span className="mr-sl-badge__dot" />
                  {contextResolved.label}
                  {contextResolved.pinned ? ` @ ${contextResolved.pinned}` : null}
                </span>
              }
            />
          ) : null}
          <SpecRow
            label="Track"
            value={<TrackBadge track={sectionTrack as TrackName} />}
          />
          <SpecRow
            label="Lifecycle"
            value={
              <LifecycleBadge
                lifecycle={sectionLifecycle as LifecycleName}
                label={lifecycleLabel(sectionLifecycle)}
              />
            }
          />
          {section.motionDensity?.length ? (
            <SpecRow label="Motion" value={section.motionDensity.join(" · ")} />
          ) : null}
          {section.attribution?.originatingProject ? (
            <SpecRow label="Origin" value={section.attribution.originatingProject} />
          ) : null}
          {section.attribution?.submittedAt ? (
            <SpecRow label="Submitted" value={section.attribution.submittedAt} />
          ) : null}
          {section.attribution?.approvedAt || section.attribution?.promotedAt ? (
            <SpecRow
              label="Approved"
              value={section.attribution.approvedAt ?? section.attribution.promotedAt!}
            />
          ) : null}
        </dl>
      </div>

    </aside>
  );
}

/* ─────────────────────────── CurationDrawer ─────────────────────────── */

function CurationDrawer({
  section,
  onClose,
  open,
  onSectionUpdate,
}: {
  section: ManifestEntry;
  onClose: () => void;
  open: boolean;
  onSectionUpdate: (updated: ManifestEntry) => void;
}) {
  const ref = useSlide<HTMLElement>(open, DRAWER_OPEN_STYLES, DRAWER_CLOSED_STYLES);
  return (
    <aside
      ref={ref}
      className="mr-mk-detail__drawer mr-mk-detail__drawer--left"
      data-open={open}
      aria-hidden={!open}
      aria-label="Curation"
    >
      <header className="mr-mk-detail__drawer-head">
        <div className="mr-mk-detail__drawer-eyebrow">Curation</div>
        <h2 className="mr-mk-detail__drawer-title">{section.name}</h2>
        <button
          type="button"
          className="mr-mk-detail__drawer-close"
          onClick={onClose}
          aria-label="Close curation"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <CuratorPanel section={section} onUpdate={onSectionUpdate} />
    </aside>
  );
}

/* ─────────────────────────── CuratorPanel ─────────────────────────── */

/**
 * Slim curation surface — editable description / tags / motionDensity +
 * video drop-zone + lifecycle transitions. Visible on every detail page;
 * primary use is curators reviewing Submitted/InReview/Approved sections.
 *
 * Saves go through PUT /api/sections/[id]/curation (Octokit-backed commit).
 * Video uploads go through POST /api/sections/[id]/preview-upload (Supabase),
 * then the returned URL is PUT into the curation endpoint.
 */
function CuratorPanel({
  section,
  onUpdate,
}: {
  section: ManifestEntry;
  onUpdate: (updated: ManifestEntry) => void;
}) {
  const lifecycle = getLifecycle(section);
  const transitions = transitionsFrom(lifecycle);

  const [description, setDescription] = useState(section.description ?? "");
  const [tags, setTags] = useState<string[]>(section.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [motionDensity, setMotionDensity] = useState<string[]>(section.motionDensity ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(section.previews?.video ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [transitionPending, setTransitionPending] = useState<Lifecycle | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Resync local form state when the user navigates to a different section.
  useEffect(() => {
    setDescription(section.description ?? "");
    setTags(section.tags ?? []);
    setMotionDensity(section.motionDensity ?? []);
    setVideoUrl(section.previews?.video ?? null);
    setSaveError(null);
    setSaveOk(false);
    setUploadError(null);
    setTransitionError(null);
  }, [section.id, section.description, section.tags, section.motionDensity, section.previews?.video]);

  // Live-evaluate the Approve gate against the in-progress edits so the
  // curator sees the gate flip as they fix fields, before they save.
  const draftSection: ManifestEntry = useMemo(
    () => ({
      ...section,
      description,
      tags,
      motionDensity,
      previews: { ...(section.previews ?? {}), static: section.previews?.static },
    }),
    [section, description, tags, motionDensity],
  );
  const missing = missingForApproval(draftSection);

  function toggleMotion(m: string) {
    setMotionDensity((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  function commitTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((cur) => [...cur, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags((cur) => cur.filter((x) => x !== t));
  }
  function onTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((cur) => cur.slice(0, -1));
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/sections/${section.id}/curation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, tags, motionDensity }),
      });
      const data = (await res.json()) as { ok: boolean; section?: ManifestEntry; error?: string };
      if (!data.ok || !data.section) {
        setSaveError(data.error ?? "Save failed");
        return;
      }
      onUpdate(data.section);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (err) {
      setSaveError((err as Error)?.message ?? "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideo(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const upRes = await fetch(`/api/sections/${section.id}/preview-upload`, {
        method: "POST",
        body: form,
      });
      const upData = (await upRes.json()) as { ok: boolean; url?: string; error?: string };
      if (!upData.ok || !upData.url) {
        setUploadError(upData.error ?? "Upload failed");
        return;
      }
      // Persist the URL on section.json via the curation endpoint.
      const putRes = await fetch(`/api/sections/${section.id}/curation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewVideoUrl: upData.url }),
      });
      const putData = (await putRes.json()) as { ok: boolean; section?: ManifestEntry; error?: string };
      if (!putData.ok || !putData.section) {
        setUploadError(putData.error ?? "Saved video URL but couldn't update section.json");
        return;
      }
      setVideoUrl(upData.url);
      onUpdate(putData.section);
    } catch (err) {
      setUploadError((err as Error)?.message ?? "Network error");
    } finally {
      setUploading(false);
    }
  }

  async function removeVideo() {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch(`/api/sections/${section.id}/curation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewVideoUrl: null }),
      });
      const data = (await res.json()) as { ok: boolean; section?: ManifestEntry; error?: string };
      if (!data.ok || !data.section) {
        setUploadError(data.error ?? "Couldn't remove video");
        return;
      }
      setVideoUrl(null);
      onUpdate(data.section);
    } catch (err) {
      setUploadError((err as Error)?.message ?? "Network error");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadVideo(file);
  }

  async function runTransition(t: Transition) {
    setTransitionPending(t.to);
    setTransitionError(null);
    try {
      const res = await fetch(`/api/sections/${section.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: t.to }),
      });
      const data = (await res.json()) as { ok: boolean; section?: ManifestEntry; error?: string };
      if (!data.ok) {
        setTransitionError(data.error ?? "Action failed");
        return;
      }
      if (data.section) onUpdate(data.section);
    } catch (err) {
      setTransitionError((err as Error)?.message ?? "Network error");
    } finally {
      setTransitionPending(null);
    }
  }

  const descTooShort = description.trim().length > 0 && description.trim().length < 20;
  const dirty =
    description !== (section.description ?? "") ||
    JSON.stringify(tags) !== JSON.stringify(section.tags ?? []) ||
    JSON.stringify(motionDensity) !== JSON.stringify(section.motionDensity ?? []);

  return (
    <div className="mr-curator">
      <Field className="mr-curator__field">
        <FieldLabel className="mr-curator__label">Description</FieldLabel>
        <FieldDescription>
          1–2 sentences. What the section IS, structurally.
        </FieldDescription>
        <Textarea
          rows={4}
          placeholder="e.g. Two-column hero with eyebrow + display headline + supporting copy + CTA on the left, dual-column vertical-marquee gallery on the right…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          state={descTooShort ? "error" : "default"}
        />
        {descTooShort ? (
          <FieldError>Minimum 20 characters.</FieldError>
        ) : (
          <div className="mr-curator__char-count">
            {description.trim().length} characters
          </div>
        )}
      </Field>

      <Field className="mr-curator__field">
        <FieldLabel className="mr-curator__label">Tags</FieldLabel>
        <FieldDescription>
          Short, kebab-case keywords curators and the AI use to find this section.
        </FieldDescription>
        <div className="mr-curator__tagrow">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className="mr-curator__tagchip"
              onClick={() => removeTag(t)}
              aria-label={`Remove tag ${t}`}
            >
              {t}
              <span className="mr-curator__tagchip-x" aria-hidden>×</span>
            </button>
          ))}
          <input
            type="text"
            className="mr-curator__taginput"
            placeholder={tags.length === 0 ? "split-2col, hero, minimal…" : "Add tag"}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKey}
            onBlur={commitTag}
          />
        </div>
      </Field>

      <Field className="mr-curator__field">
        <FieldLabel className="mr-curator__label">Motion density</FieldLabel>
        <FieldDescription>
          Tendencies the layout supports. Multi-select.
        </FieldDescription>
        <ToggleGroup
          type="multiple"
          value={motionDensity}
          onValueChange={(v) => setMotionDensity(v)}
          aria-label="Motion density"
        >
          {MOTION_OPTIONS.map((m) => (
            <ToggleGroupItem key={m} value={m} aria-label={m}>
              {m}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field className="mr-curator__field">
        <FieldLabel className="mr-curator__label">
          Video clip <span className="mr-curator__optional">optional</span>
        </FieldLabel>
        <FieldDescription>
          A short .webm or .mp4 that autoplays on card hover. Max 15 MB.
        </FieldDescription>
        {videoUrl ? (
          <div className="mr-curator__video-wrap">
            <video
              className="mr-curator__video"
              src={videoUrl}
              controls
              muted
              loop
              playsInline
            />
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={removeVideo}
              disabled={uploading}
            >
              Remove video
            </Button>
          </div>
        ) : (
          <label
            className={`mr-curator__dropzone${dragOver ? " mr-curator__dropzone--over" : ""}`}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept="video/mp4,video/webm"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadVideo(file);
              }}
            />
            {uploading ? (
              <span className="mr-curator__dropzone-title">Uploading…</span>
            ) : (
              <>
                <span className="mr-curator__dropzone-title">Drop a .webm or .mp4</span>
                <span className="mr-curator__dropzone-hint">or click to browse</span>
              </>
            )}
          </label>
        )}
        {uploadError ? <FieldError>{uploadError}</FieldError> : null}
      </Field>

      <div className="mr-curator__actions">
        <Button
          type="button"
          variant="primary"
          shape="pill"
          onClick={save}
          disabled={!dirty || saving || descTooShort}
        >
          {saving ? "Saving…" : saveOk ? "Saved" : "Save changes"}
        </Button>
        {saveError ? <FieldError>{saveError}</FieldError> : null}
      </div>

      {missing.length > 0 ? (
        <div className="mr-curator__gate">
          <div className="mr-curator__gate-title">Approval blocked</div>
          <ul className="mr-curator__gate-list">
            {missing.map((m) => (
              <li key={m}>{APPROVAL_FIELD_LABELS[m]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {transitions.length > 0 ? (
        <div className="mr-curator__transitions" role="group" aria-label="Lifecycle actions">
          {transitions.map((t) => {
            const isApproveBlocked = t.to === "Approved" && missing.length > 0;
            const pending = transitionPending === t.to;
            const variant = t.kind === "forward" ? "secondary" : t.kind === "back" ? "tertiary" : "ghost";
            return (
              <Button
                key={t.to}
                type="button"
                variant={variant}
                size="sm"
                onClick={() => runTransition(t)}
                disabled={isApproveBlocked || pending || dirty}
                title={
                  dirty
                    ? "Save your changes first"
                    : isApproveBlocked
                      ? "Approval requirements not met"
                      : t.hint
                }
              >
                {pending ? "…" : t.label}
              </Button>
            );
          })}
        </div>
      ) : null}
      {transitionError ? <FieldError>{transitionError}</FieldError> : null}
    </div>
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

