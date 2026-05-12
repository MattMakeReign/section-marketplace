"use client";

/**
 * <Gallery /> — Marketplace browse + detail surface.
 *
 * Family aesthetic mirrors the /design-system explorer (Cargo-derived):
 * eggshell ground, white cards on muted, light-300 display headline,
 * Geist-Mono spec labels.
 *
 * Filter dimensions ship the four we have data for:
 *   Category · Track · Animation (motionDensity) · Tags
 * Plus a Sort pill. Layout / Interaction / Platform pills from the reference
 * are intentionally NOT shipped — those metadata dimensions don't exist on
 * `section.json` yet, and per PRD §5 metadata is curation-owned (so the
 * right time to add them is during Phase 5 lifecycle work).
 *
 * Click a card → modal:
 *   - Title + brand badge (top left)
 *   - Copy section CTA + Heart + Close (top right)
 *   - Desktop / Tablet / Mobile viewport toggle on the preview stage
 *   - Side nav arrows to walk between sections
 *   - Spec strip + install command (bottom)
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Manifest } from "./marketplace-data";
import {
  // Filter row icons
  IconCategory, IconAnimation, IconTag, IconTrack, IconSort, IconLifecycle,
  // Detail modal icons (kept locally — modal isn't shared yet)
  IconDesktop, IconTablet, IconMobile,
  IconCopy, IconClose, IconChevronLeft, IconChevronRight, IconHeart,
  // Shared types / helpers / presentational components
  type ManifestEntry, type Track, type Lifecycle,
  TRACKS, LIFECYCLES, getLifecycle, lifecycleLabel, capitalize,
  FilterPill, SectionCard, Spec,
  // State-machine for curator actions.
  transitionsFrom, type Transition,
  // Curation gate — Approve is blocked until required metadata is filled.
  missingForApproval,
} from "@mr/section-library-ui";
import { CANONICAL_CATEGORIES, CANONICAL_IDS } from "@/lib/canonical-categories";

const ALL = "all";
type Sort = "name-asc" | "category" | "track" | "newest";
const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "name-asc", label: "Name A → Z" },
  { id: "category", label: "Category" },
  { id: "track", label: "Track" },
  { id: "newest", label: "Newest" },
];
type Viewport = "desktop" | "tablet" | "mobile";

export function Gallery({ manifest }: { manifest: Manifest }) {
  // Overlay map of curator-mutated sections. Applied on top of the
  // server-provided manifest so transition clicks reflect immediately
  // without waiting for the server-component refresh round-trip.
  const [overlay, setOverlay] = useState<Record<string, ManifestEntry>>({});

  const sections = useMemo(() => {
    const base = manifest.sections ?? [];
    if (Object.keys(overlay).length === 0) return base;
    return base.map((s) => overlay[s.id] ?? s);
  }, [manifest, overlay]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [track, setTrack] = useState<string>(ALL);
  const [lifecycle, setLifecycle] = useState<string>(ALL);
  const [animation, setAnimation] = useState<string>(ALL);
  const [tag, setTag] = useState<string>(ALL);
  const [sort, setSort] = useState<Sort>("name-asc");
  const [openId, setOpenId] = useState<string | null>(null);
  const [curatorMode, setCuratorMode] = useState(false);

  // Pick up `?lifecycle=<state>` and `?mode=curate` from the URL.
  //  - `?lifecycle=…` deep-links from elsewhere (e.g. the Submit-for-curation
  //    toast in the Browser Workspace) land on the right filtered view.
  //  - `?mode=curate` unlocks the curator action bar in the detail modal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const l = params.get("lifecycle");
    if (l && LIFECYCLES.includes(l as Lifecycle)) setLifecycle(l);
    if (params.get("mode") === "curate") setCuratorMode(true);
  }, []);

  // Curator action handler — passed down to Detail. Optimistically writes
  // into the overlay so the badge/action bar reflect immediately.
  const handleSectionUpdate = (updated: ManifestEntry) => {
    setOverlay((prev) => ({ ...prev, [updated.id]: updated }));
  };

  // Derived filter option lists.
  //
  // Categories are the **canonical 16** (see `lib/canonical-categories.ts`).
  // Order is fixed — page sections first in editorial reading order, then the
  // two persistence sections (Navigation, Footer). Counts include 0-buckets so
  // the taxonomy stays stable as the catalogue fills out.
  //
  // If a submitted section's `category` doesn't match a canonical id yet (the
  // curator hasn't promoted it / hasn't picked a canonical one), it's bucketed
  // under a synthetic "other" pill at the end. Once the curator picks a
  // canonical, the "other" count drops accordingly.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    let other = 0;
    for (const id of CANONICAL_IDS) counts.set(id, 0);
    sections.forEach((s) => {
      if (counts.has(s.category)) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
      else other += 1;
    });
    const result = CANONICAL_CATEGORIES.map(c => ({ id: c.id, label: c.label, count: counts.get(c.id) ?? 0 }));
    if (other > 0) result.push({ id: "__other", label: "Uncategorised", count: other });
    return result;
  }, [sections]);

  const trackCounts = useMemo(() => {
    const c: Record<string, number> = { stable: 0, experimental: 0, legacy: 0 };
    sections.forEach((s) => { const t = (s.track ?? "stable") as Track; c[t] = (c[t] ?? 0) + 1; });
    return c;
  }, [sections]);

  const lifecycleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of LIFECYCLES) c[l] = 0;
    sections.forEach((s) => {
      const l = getLifecycle(s);
      c[l] = (c[l] ?? 0) + 1;
    });
    return c;
  }, [sections]);

  const animationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    sections.forEach((s) => (s.motionDensity ?? []).forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1)));
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => ({ id, count }));
  }, [sections]);

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    sections.forEach((s) => (s.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
  }, [sections]);

  // Active filter list (drives the filtered + sorted output).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = sections.filter((s) => {
      const sLifecycle = getLifecycle(s);
      // Default-hide Archived + Deprecated from the browse view. The Lifecycle
      // pill still surfaces them — the designer has to explicitly summon them.
      // Applied to all consumers (visitor + curator) so archive feels like
      // archive, not "still mixed in but with a badge".
      if (lifecycle === ALL && (sLifecycle === "Archived" || sLifecycle === "Deprecated")) return false;
      if (category !== ALL) {
        if (category === "__other") {
          if ((CANONICAL_IDS as string[]).includes(s.category)) return false;
        } else if (s.category !== category) return false;
      }
      const t = (s.track ?? "stable") as Track;
      if (track !== ALL && t !== track) return false;
      if (lifecycle !== ALL && sLifecycle !== lifecycle) return false;
      if (animation !== ALL && !(s.motionDensity ?? []).includes(animation)) return false;
      if (tag !== ALL && !(s.tags ?? []).includes(tag)) return false;
      if (!q) return true;
      const haystack = [s.id, s.name, s.description, s.category, ...(s.tags ?? [])]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "category": return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        case "track": return ((a.track ?? "stable") as string).localeCompare((b.track ?? "stable") as string) || a.name.localeCompare(b.name);
        case "newest": return (b.created ?? "").localeCompare(a.created ?? "") || a.name.localeCompare(b.name);
        case "name-asc":
        default: return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [sections, query, category, track, lifecycle, animation, tag, sort]);

  const filtersDirty = query !== "" || category !== ALL || track !== ALL || lifecycle !== ALL || animation !== ALL || tag !== ALL || sort !== "name-asc";

  function clearAll() {
    setQuery(""); setCategory(ALL); setTrack(ALL); setLifecycle(ALL); setAnimation(ALL); setTag(ALL); setSort("name-asc");
  }

  // Modal navigation state.
  const openIndex = openId ? filtered.findIndex((s) => s.id === openId) : -1;
  const open = openIndex >= 0 ? filtered[openIndex] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      else if (e.key === "ArrowLeft" && openIndex > 0) setOpenId(filtered[openIndex - 1].id);
      else if (e.key === "ArrowRight" && openIndex < filtered.length - 1) setOpenId(filtered[openIndex + 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openIndex, filtered]);

  return (
    <>
      <header className="mr-mk-topbar">
        <div className="mr-mk-topbar__brand">
          <span className="mr-mk-topbar__sub">MakeReign</span>
          <span className="mr-mk-topbar__wordmark">Section Library</span>
          {curatorMode ? <span className="mr-mk-curator-flag">Curator mode</span> : null}
        </div>
        {curatorMode ? (
          <nav className="mr-mk-topbar__nav">
            <Link href="/?mode=curate" className="mr-mk-topbar__navlink mr-mk-topbar__navlink--active">Catalogue</Link>
            <Link href="/review?mode=curate" className="mr-mk-topbar__navlink">Review queue</Link>
          </nav>
        ) : null}
        <div className="mr-mk-topbar__right">
          <span>{sections.length} sections</span>
          <span>v{manifest.generated ? "1.0" : "1.0"}</span>
        </div>
      </header>

      <section className="mr-mk-header">
        <div className="mr-mk-header__eyebrow">Sections / All</div>
        <h1 className="mr-mk-header__title">
          Reusable sections, <em>adapted to your project.</em>
        </h1>
        <p className="mr-mk-header__sub">
          Browse the catalogue. Each section adapts to the project it lands in — local typography, colours,
          spacing, motion. Open any section to inspect its specs and copy the install command.
        </p>
      </section>

      <div className="mr-mk-filters">
        <input
          type="search"
          className="mr-mk-search"
          placeholder="Search sections, tags, descriptions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search marketplace"
        />

        <FilterPill
          label="Category"
          icon={<IconCategory />}
          value={category}
          options={[{ id: ALL, label: "All categories", count: sections.length }, ...categories.map((c) => ({ id: c.id, label: c.label, count: c.count }))]}
          onChange={setCategory}
        />

        <FilterPill
          label="Track"
          icon={<IconTrack />}
          value={track}
          options={[
            { id: ALL, label: "All tracks", count: sections.length },
            ...TRACKS.map((t) => ({ id: t, label: capitalize(t), count: trackCounts[t] ?? 0, dot: `var(--chrome-track-${t})` })),
          ]}
          onChange={setTrack}
        />

        <FilterPill
          label="Lifecycle"
          icon={<IconLifecycle />}
          value={lifecycle}
          options={[
            { id: ALL, label: "All lifecycle states", count: sections.length },
            ...LIFECYCLES.map((l) => ({
              id: l,
              label: lifecycleLabel(l),
              count: lifecycleCounts[l] ?? 0,
              dot: `var(--chrome-lifecycle-${l.toLowerCase()})`,
            })),
          ]}
          onChange={setLifecycle}
        />

        <FilterPill
          label="Animation"
          icon={<IconAnimation />}
          value={animation}
          options={[{ id: ALL, label: "All densities", count: sections.length }, ...animationOptions.map((a) => ({ id: a.id, label: capitalize(a.id), count: a.count }))]}
          onChange={setAnimation}
        />

        <FilterPill
          label="Tags"
          icon={<IconTag />}
          value={tag}
          options={[{ id: ALL, label: "All tags", count: sections.length }, ...tagOptions.map((t) => ({ id: t.id, label: t.id, count: t.count }))]}
          onChange={setTag}
        />

        <div className="mr-mk-filters__spacer" />

        <FilterPill
          label={SORTS.find((s) => s.id === sort)?.label ?? "Sort"}
          icon={<IconSort />}
          value={sort}
          options={SORTS.map((s) => ({ id: s.id, label: s.label }))}
          onChange={(v) => setSort(v as Sort)}
        />

        {filtersDirty ? (
          <button type="button" className="mr-mk-clear" onClick={clearAll}>Clear all</button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="mr-mk-empty">
          {lifecycle !== ALL && category === ALL && track === ALL && animation === ALL && tag === ALL && query === "" ? (
            <p>
              No sections currently in <strong>{lifecycleLabel(lifecycle as Lifecycle)}</strong>.
              {lifecycle === "Submitted" ? (
                <> Run <code>mr submit</code> from inside a project to land one here.</>
              ) : null}
            </p>
          ) : (
            <p>No sections match. Try clearing filters.</p>
          )}
        </div>
      ) : (
        <div className="mr-mk-grid">
          {filtered.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              previewSrc={s.previews?.static ? `/preview/${s.id}` : undefined}
              onOpen={() => setOpenId(s.id)}
            />
          ))}
        </div>
      )}

      {open ? (
        <Detail
          section={open}
          hasPrev={openIndex > 0}
          hasNext={openIndex < filtered.length - 1}
          onPrev={() => setOpenId(filtered[openIndex - 1].id)}
          onNext={() => setOpenId(filtered[openIndex + 1].id)}
          onClose={() => setOpenId(null)}
          curatorMode={curatorMode}
          onSectionUpdate={handleSectionUpdate}
        />
      ) : null}
    </>
  );
}

/* ─────────────────────────── Detail ────────────────────────── */

/**
 * Preview pipeline is SAME-ORIGIN. The marketplace bundles its own copy
 * of the section primitives + a neutral design system, and renders any
 * section at `/render/<id>`. No sibling project has to be running for
 * the catalogue to show what a section looks like — which is the only
 * shape that works once the Library App is hosted in the cloud.
 *
 * The viewport toggle sets a REAL device width on the iframe; the
 * surrounding frame scales it down via CSS transform if the stage is
 * narrower than the device target. So the section sees a true desktop /
 * tablet / mobile viewport and renders its actual responsive breakpoints.
 */
const DEVICE_WIDTH: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 390,
};

function Detail({
  section, hasPrev, hasNext, onPrev, onNext, onClose, curatorMode, onSectionUpdate,
}: {
  section: ManifestEntry;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  curatorMode: boolean;
  onSectionUpdate: (s: ManifestEntry) => void;
}) {
  const sectionTrack = (section.track ?? "stable") as Track;
  const sectionLifecycle = getLifecycle(section);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"preview" | "about" | "specs">("preview");
  const [readme, setReadme] = useState<{ html: string } | null>(null);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState<string | null>(null);

  // Iframe scale-to-fit. The iframe renders at the device's REAL pixel width
  // (1440 / 768 / 390); the visual scale is computed against the stage's
  // available width so it always fits inside the modal.
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Reset viewport + tab + cached README when navigating between sections.
  useEffect(() => {
    setViewport("desktop");
    setTab("preview");
    setReadme(null);
    setReadmeError(null);
  }, [section.id]);

  // Recompute scale when viewport changes or the frame resizes.
  useEffect(() => {
    if (tab !== "preview") return;
    const frame = frameRef.current;
    if (!frame) return;
    const targetW = DEVICE_WIDTH[viewport];
    const update = () => {
      const available = frame.clientWidth;
      // Never scale UP — a 390px mobile iframe at 1.0 inside a 1200px stage
      // should look like a mobile-sized phone, not a stretched billboard.
      setScale(Math.min(1, available / targetW));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(frame);
    return () => obs.disconnect();
  }, [tab, viewport]);

  // Lazy-fetch README the first time the About tab is visible.
  useEffect(() => {
    if (tab !== "about") return;
    if (readme || readmeLoading) return;
    let cancelled = false;
    setReadmeLoading(true);
    fetch(`/readme/${section.id}`)
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setReadmeError(json.error ?? `HTTP ${r.status}`);
        } else {
          setReadme({ html: json.html });
        }
      })
      .catch((e) => { if (!cancelled) setReadmeError(String(e)); })
      .finally(() => { if (!cancelled) setReadmeLoading(false); });
    return () => { cancelled = true; };
  }, [tab, readme, readmeLoading, section.id]);

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(`mr add ${section.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — silent.
    }
  }

  return (
    <div className="mr-mk-modal-backdrop" role="dialog" aria-label={`${section.name} details`} onClick={onClose}>
      <div className="mr-mk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mr-mk-modal__head">
          <div className="mr-mk-modal__head-left">
            <h2 className="mr-mk-modal__title">{section.name}</h2>
            <span className="mr-mk-modal__brand">
              <span className="mr-mk-card__brand-mark" aria-hidden>MR</span>
              MakeReign · {section.submittedBy ?? "core"}
            </span>
          </div>
          <div className="mr-mk-modal__actions">
            <button type="button" className="mr-mk-cta" onClick={copyInstall}>
              <IconCopy />
              {copied ? "Copied" : "Copy install"}
            </button>
            <button type="button" className="mr-mk-iconbtn" aria-label="Favourite">
              <IconHeart />
            </button>
            <button type="button" className="mr-mk-iconbtn" aria-label="Close" onClick={onClose}>
              <IconClose />
            </button>
          </div>
        </div>

        {curatorMode ? (
          <CuratorActionBar section={section} onSectionUpdate={onSectionUpdate} />
        ) : null}

        <div className="mr-mk-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            className="mr-mk-tab"
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "about"}
            className="mr-mk-tab"
            onClick={() => setTab("about")}
          >
            About
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "specs"}
            className="mr-mk-tab"
            onClick={() => setTab("specs")}
          >
            Specs
          </button>
          <div className="mr-mk-tabs__spacer" />
          <button
            type="button"
            className="mr-mk-tabs__nav"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous section"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className="mr-mk-tabs__nav"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next section"
          >
            <IconChevronRight />
          </button>
        </div>

        {tab === "preview" ? (
          <div className="mr-mk-modal__stage" role="tabpanel">
            <div className="mr-mk-viewport-toggle" role="tablist" aria-label="Preview viewport">
              <ViewportBtn active={viewport === "desktop"} onClick={() => setViewport("desktop")}>
                <IconDesktop /> Desktop
              </ViewportBtn>
              <ViewportBtn active={viewport === "tablet"} onClick={() => setViewport("tablet")}>
                <IconTablet /> Tablet
              </ViewportBtn>
              <ViewportBtn active={viewport === "mobile"} onClick={() => setViewport("mobile")}>
                <IconMobile /> Mobile
              </ViewportBtn>
            </div>

            <div className="mr-mk-preview-frame" data-viewport={viewport} ref={frameRef}>
              <iframe
                key={`${section.id}-${viewport}`}
                src={`/render/${section.id}`}
                title={`${section.name} live preview`}
                className="mr-mk-preview-iframe"
                style={{
                  width: `${DEVICE_WIDTH[viewport]}px`,
                  height: `${100 / scale}%`,
                  transform: `scale(${scale})`,
                } as CSSProperties}
                loading="lazy"
              />
            </div>

            <div className="mr-mk-preview-source" title="Section rendered by the Library App itself">
              <span className="mr-mk-preview-source__dot" /> neutral preview
            </div>
          </div>
        ) : tab === "about" ? (
          <div className="mr-mk-tabpanel" role="tabpanel">
            {readmeLoading ? (
              <span className="mr-mk-prose-loading">Loading…</span>
            ) : readmeError ? (
              <div className="mr-mk-prose">
                <p>
                  No README found for this section. The marketplace expects a <code>README.md</code>
                  next to <code>section.json</code> with <em>when to use</em>, <em>when not to use</em>,
                  and motion / responsive notes — that file becomes the AI-readable layer when Claude
                  adapts the section into a project.
                </p>
              </div>
            ) : readme ? (
              <div className="mr-mk-prose" dangerouslySetInnerHTML={{ __html: readme.html }} />
            ) : null}
          </div>
        ) : (
          <div className="mr-mk-modal__specs" role="tabpanel">
            <Spec label="Category" value={capitalize(section.category)} />
            <Spec label="Version" value={`v${section.version}`} />
            <Spec
              label="Track"
              value={
                <span className="mr-sl-badge" data-track={sectionTrack}>
                  <span className="mr-sl-badge__dot" />
                  {sectionTrack}
                </span>
              }
            />
            <Spec
              label="Lifecycle"
              value={
                <span className="mr-sl-badge" data-lifecycle={sectionLifecycle}>
                  <span className="mr-sl-badge__dot" />
                  {lifecycleLabel(sectionLifecycle)}
                </span>
              }
            />
            {section.attribution?.originalCreator ? (
              <Spec label="Original creator" value={section.attribution.originalCreator} />
            ) : null}
            {section.attribution?.originatingProject ? (
              <Spec label="Originating project" value={section.attribution.originatingProject} />
            ) : null}
            {section.attribution?.submittedAt ? (
              <Spec label="Submitted" value={section.attribution.submittedAt} />
            ) : null}
            {section.attribution?.promotedAt ? (
              <Spec label="Promoted" value={section.attribution.promotedAt} />
            ) : null}
            {section.motionDensity?.length ? (
              <Spec label="Motion density" value={section.motionDensity.join(" · ")} />
            ) : null}
            {section.responsive?.profile ? (
              <Spec label="Responsive" value={section.responsive.profile} />
            ) : null}
            {section.tags?.length ? (
              <Spec
                label="Tags"
                value={<>{section.tags.map((t) => <span key={t} className="mr-mk-tag">{t}</span>)}</>}
              />
            ) : null}
            <Spec label="Install" value={<code className="mr-mk-spec__install">mr add {section.id}</code>} />
          </div>
        )}
      </div>
    </div>
  );
}

function ViewportBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`mr-mk-viewport-toggle__btn${active ? " mr-mk-viewport-toggle__btn--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────── CuratorActionBar ─────────────────────────── */
/**
 * Lifecycle transition strip rendered in the detail modal when the gallery
 * is opened with `?mode=curate`. Reads the section's current state, looks up
 * the valid next states from the shared state-machine, and POSTs to the
 * lifecycle API on click. Optimistically writes the response back into the
 * Gallery's overlay map AND fires router.refresh() so the manifest re-flows
 * from the server next render.
 */
function CuratorActionBar({
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
    <div className="mr-mk-curator-bar" role="toolbar" aria-label="Lifecycle actions">
      <div className="mr-mk-curator-bar__current">
        <span className="mr-mk-curator-bar__eyebrow">Lifecycle</span>
        <span className="mr-sl-badge" data-lifecycle={current}>
          <span className="mr-sl-badge__dot" />
          {lifecycleLabel(current)}
        </span>
      </div>
      <div className="mr-mk-curator-bar__actions">
        {transitions.length === 0 ? (
          <span className="mr-mk-curator-bar__empty">Terminal state — no transitions</span>
        ) : (
          transitions.map((t) => {
            // Approve is gated on curation completeness — but ONLY on the
            // forward transition (InReview → Approved). Backward moves like
            // Promoted → Approved (Unpromote) are restores and shouldn't be
            // blocked: the section was already approved at some point and
            // we're just walking it back.
            const gatedByCuration =
              t.to === "Approved" && t.kind === "forward" && missing.length > 0;
            return (
              <button
                key={t.to}
                type="button"
                className={`mr-mk-curator-btn mr-mk-curator-btn--${t.kind}`}
                onClick={() => go(t)}
                disabled={busy !== null || gatedByCuration}
                title={gatedByCuration
                  ? `Curation incomplete — fill in ${missing.length} required field${missing.length === 1 ? "" : "s"} first`
                  : t.hint ?? ""}
                data-target={t.to}
              >
                {busy === t.to ? "…" : t.label}
              </button>
            );
          })
        )}
        {/* When we're in a state where curation matters (Submitted / InReview)
            and isn't complete, surface the enrich link prominently so the
            curator can jump straight to the form. */}
        {(current === "Submitted" || current === "InReview") && missing.length > 0 ? (
          <a
            href={`/sections/${section.id}/edit?mode=curate`}
            className="mr-mk-curator-btn mr-mk-curator-btn--enrich"
            title={`${missing.length} required field${missing.length === 1 ? "" : "s"} missing`}
          >
            Enrich · {missing.length} left
          </a>
        ) : null}
      </div>
      {error ? (
        <span className="mr-mk-curator-bar__error" role="alert">{error}</span>
      ) : null}
    </div>
  );
}

