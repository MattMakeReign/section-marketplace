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

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Manifest } from "./marketplace-data";
import {
  // Filter row icons
  IconCategory, IconAnimation, IconTag, IconTrack, IconSort, IconLifecycle,
  // Shared types / helpers / presentational components
  type ManifestEntry, type Track, type Lifecycle,
  TRACKS, LIFECYCLES, getLifecycle, lifecycleLabel, capitalize,
  FilterPill, SectionCard,
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

export function Gallery({ manifest }: { manifest: Manifest }) {
  // Detail route fires `router.refresh()` after curator transitions, so the
  // gallery picks up state changes via the server-component re-render — no
  // need for a local optimistic overlay anymore.
  const sections = manifest.sections ?? [];

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [track, setTrack] = useState<string>(ALL);
  const [lifecycle, setLifecycle] = useState<string>(ALL);
  const [animation, setAnimation] = useState<string>(ALL);
  const [tag, setTag] = useState<string>(ALL);
  const [sort, setSort] = useState<Sort>("name-asc");
  const [curatorMode, setCuratorMode] = useState(false);
  const [density, setDensity] = useState<2 | 3 | 4>(3);
  const router = useRouter();

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

  // Card click handler — navigates to the full-page section detail route.
  // Curator mode is preserved through the query string.
  const openSection = (id: string) => {
    const qs = curatorMode ? "?mode=curate" : "";
    router.push(`/sections/${id}${qs}`);
  };

  return (
    <>
      <header className="mr-mk-topbar">
        <div className="mr-mk-topbar__left">
          <Link href="/" className="mr-mk-topbar__logo" aria-label="MakeReign Section Library">
            <span aria-hidden>M</span>
          </Link>
          {curatorMode ? (
            <nav className="mr-mk-topbar__tabs" aria-label="Curator">
              <Link
                href="/?mode=curate"
                className="mr-mk-topbar__tab mr-mk-topbar__tab--active"
              >
                Catalogue
              </Link>
              <Link href="/review?mode=curate" className="mr-mk-topbar__tab">
                Review queue
              </Link>
            </nav>
          ) : (
            <nav className="mr-mk-topbar__tabs" aria-label="Primary">
              <span
                className="mr-mk-topbar__tab mr-mk-topbar__tab--muted"
                aria-disabled
                data-tooltip="Coming soon"
              >
                Pages
              </span>
              <span className="mr-mk-topbar__tab mr-mk-topbar__tab--active">
                Sections
              </span>
              <span
                className="mr-mk-topbar__tab mr-mk-topbar__tab--muted"
                aria-disabled
                data-tooltip="Coming soon"
              >
                Components
              </span>
            </nav>
          )}
        </div>

        <div className="mr-mk-topbar__search-wrap">
          <label className="mr-mk-topbar__search">
            <span className="mr-mk-topbar__search-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search sections…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search marketplace"
            />
          </label>
        </div>

        <div className="mr-mk-topbar__right">
          <button
            type="button"
            className="mr-mk-topbar__icon-btn"
            aria-label="Bookmarks"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 3.5h9v11l-4.5-3-4.5 3v-11z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="mr-mk-topbar__icon-btn"
            aria-label="Help"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="6.75" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M7.25 7.25a1.75 1.75 0 113.05 1.17c-.4.42-1.3.86-1.3 1.7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="9" cy="12.75" r="0.6" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="mr-mk-topbar__icon-btn"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 12.5h9l-1-1.5V8a3.5 3.5 0 10-7 0v3l-1 1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 14a1.5 1.5 0 003 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <ProfileMenu sections={sections.length} curatorMode={curatorMode} />
        </div>
      </header>

      <div className="mr-mk-filters">
        <FilterPill
          label="Category"
          icon={<IconCategory />}
          value={category}
          options={[{ id: ALL, label: "All categories", count: sections.length }, ...categories.map((c) => ({ id: c.id, label: c.label, count: c.count }))]}
          onChange={setCategory}
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

        <div
          className="mr-mk-density"
          role="radiogroup"
          aria-label="Grid density"
        >
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={density === n}
              aria-label={`${n}-column grid`}
              className={`mr-mk-density__btn${density === n ? " mr-mk-density__btn--active" : ""}`}
              onClick={() => setDensity(n as 2 | 3 | 4)}
            >
              <DensityIcon cols={n as 2 | 3 | 4} />
            </button>
          ))}
        </div>

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
        <div className="mr-mk-grid" data-density={density}>
          {filtered.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              previewSrc={s.previews?.static ? `/preview/${s.id}` : undefined}
              onOpen={() => openSection(s.id)}
            />
          ))}
        </div>
      )}

    </>
  );
}

/* ─────────────────────────── ProfileMenu ─────────────────────────── */
/**
 * Avatar in the top bar + click-to-open dropdown. Functional surface for the
 * theme switcher (light / dark / system). Everything else is a visual stub —
 * View profile / Workspace / Request content / Give feedback / Settings / Log out
 * all render as inert rows so the auth-bound work can land later without
 * reshaping the menu.
 *
 * Avatar renders as an empty dark circle for now. When auth lands it shows a
 * profile photo (or initials as a fallback).
 */
type ThemeChoice = "light" | "dark" | "system";
// (The "light" theme IS the Mobbin-derived achromatic look. The token
// override block in styles.css is keyed to `data-theme="light"` so the
// iframe at /render/<id> also inherits it — which prevents the design-
// system's dark @media block from over-specificity-winning when the OS
// is in dark mode. Documented gotcha in MEMORY.md.)

function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>("light");

  // Read persisted choice once, on mount. SSR-safe.
  useEffect(() => {
    const stored = (typeof window !== "undefined" ? window.localStorage.getItem("mr-mk-theme") : null) as ThemeChoice | null;
    if (stored === "light" || stored === "dark" || stored === "system") setChoice(stored);
  }, []);

  // Apply the effective theme to <html data-theme>. For "system" we follow
  // prefers-color-scheme and update live when the OS flips.
  useEffect(() => {
    const root = document.documentElement;
    window.localStorage.setItem("mr-mk-theme", choice);

    if (choice !== "system") {
      root.dataset.theme = choice;
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { root.dataset.theme = mq.matches ? "dark" : "light"; };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);

  return [choice, setChoice];
}

function ProfileMenu({ sections, curatorMode }: { sections: number; curatorMode: boolean }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside + Escape close.
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

  return (
    <div className="mr-mk-profile" ref={ref}>
      <button
        type="button"
        className="mr-mk-topbar__avatar"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${sections} sections${curatorMode ? " · Curator mode" : ""}`}
        onClick={() => setOpen((o) => !o)}
      />

      {open ? (
        <div className="mr-mk-profile-menu" role="menu">
          <div className="mr-mk-profile-menu__header">
            <span className="mr-mk-profile-menu__badge">ADMIN</span>
            <div className="mr-mk-profile-menu__name">Matt Thompson</div>
            <div className="mr-mk-profile-menu__email">matt@makereign.com</div>
            <button type="button" className="mr-mk-profile-menu__view">View profile</button>
          </div>

          <hr className="mr-mk-profile-menu__divider" />

          <button type="button" className="mr-mk-profile-menu__item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Request content
          </button>
          <button type="button" className="mr-mk-profile-menu__item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5H2.5v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Give feedback
          </button>
          <button type="button" className="mr-mk-profile-menu__item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1.5v2M8 12.5v2M3.5 8h-2M14.5 8h-2M4.5 4.5l-1.5-1.5M13 13l-1.5-1.5M4.5 11.5L3 13M13 3l-1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Settings
          </button>

          <hr className="mr-mk-profile-menu__divider" />

          <div className="mr-mk-profile-menu__theme-row">
            <span className="mr-mk-profile-menu__theme-label">Theme</span>
            <div className="mr-mk-profile-menu__theme-toggle" role="radiogroup" aria-label="Theme">
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                aria-label="Light"
                className={`mr-mk-profile-menu__theme-btn${theme === "light" ? " mr-mk-profile-menu__theme-btn--active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1.1 1.1M10.4 10.4l1.1 1.1M2.5 11.5l1.1-1.1M10.4 3.6l1.1-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                aria-label="Dark"
                className={`mr-mk-profile-menu__theme-btn${theme === "dark" ? " mr-mk-profile-menu__theme-btn--active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M11.5 8.5a4.5 4.5 0 11-6-6 4.5 4.5 0 006 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "system"}
                aria-label="System"
                className={`mr-mk-profile-menu__theme-btn${theme === "system" ? " mr-mk-profile-menu__theme-btn--active" : ""}`}
                onClick={() => setTheme("system")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 1.75v10.5a5.25 5.25 0 000-10.5z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>

          <hr className="mr-mk-profile-menu__divider" />

          <button type="button" className="mr-mk-profile-menu__item">Log out</button>
        </div>
      ) : null}
    </div>
  );
}

/* Tiny column-count glyph for the grid-density toggle. Renders N vertical bars. */
function DensityIcon({ cols }: { cols: 2 | 3 | 4 }) {
  // Bar widths + x-offsets are pre-computed so the icon stays optically balanced
  // across 2/3/4 — equal stroke width, equal gaps, centred in a 16-square viewBox.
  const layouts: Record<2 | 3 | 4, Array<{ x: number; w: number }>> = {
    2: [{ x: 3, w: 4 }, { x: 9, w: 4 }],
    3: [{ x: 2, w: 3 }, { x: 6.5, w: 3 }, { x: 11, w: 3 }],
    4: [{ x: 1.5, w: 2.5 }, { x: 5, w: 2.5 }, { x: 8.5, w: 2.5 }, { x: 12, w: 2.5 }],
  };
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      {layouts[cols].map((bar, i) => (
        <rect key={i} x={bar.x} y={3} width={bar.w} height={10} rx={1} />
      ))}
    </svg>
  );
}

