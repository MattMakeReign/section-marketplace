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

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Manifest } from "./marketplace-data";
import { TopBar } from "./topbar";
import {
  // Filter row icons (still in section-library subpath)
  IconCategory, IconCollection, IconAnimation, IconTag, IconTrack, IconSort, IconLifecycle,
  // Vocab + helpers
  type ManifestEntry, type Track, type Lifecycle,
  TRACKS, LIFECYCLES, getLifecycle, lifecycleLabel, capitalize,
  CLIENTS,
  CANONICAL_CATEGORIES, CANONICAL_IDS,
} from "@mr/section-library-ui";
import {
  FilterPill,
  SectionCard,
  DensityToggle,
  type LifecycleName,
} from "@mr/tools-ui";

const ALL = "all";
type Sort = "name-asc" | "category" | "track" | "newest";

/** Parse a section.json.context reference ("mr-halden-miller" or
 * "mr-halden-miller@2.0.0") into just the project id. Returns null for
 * empty / "_neutral" (universal section). Mirrors parseContextReference
 * in lib/brand-contexts.ts. */
function projectIdFromContextRef(ref: string | null | undefined): string | null {
  if (!ref || ref === "_neutral") return null;
  const at = ref.indexOf("@");
  return at === -1 ? ref : ref.slice(0, at);
}
const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "name-asc", label: "Name A → Z" },
  { id: "category", label: "Category" },
  { id: "track", label: "Track" },
  { id: "newest", label: "Newest" },
];

import type { BrandContextEntry } from "./marketplace-data";

export function Gallery({
  manifest,
  brandContexts = [],
}: {
  manifest: Manifest;
  brandContexts?: BrandContextEntry[];
}) {
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
  const [density, setDensity] = useState<2 | 3 | 4>(3);
  const [client, setClient] = useState<string>(ALL);
  // Project filter — value is a brand-context id (e.g. "mr-halden-miller").
  // Per decision-marketplace-frozen-section-bundles, brand contexts are
  // metadata-only and one project owns one design system. Sections reference
  // their origin project via section.json.context.
  const [project, setProject] = useState<string>(ALL);
  const router = useRouter();

  // `?lifecycle=<state>` deep-links from elsewhere (e.g. the Submit-for-curation
  // toast in the Browser Workspace) land on the right filtered view.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const l = params.get("lifecycle");
    if (l && LIFECYCLES.includes(l as Lifecycle)) setLifecycle(l);
  }, []);

  // `countableBase` — the sections that the user actually CAN see right now.
  // Filter pill counts (Category / Track / Animation / Tags / Clients) compute
  // against this so e.g. "Low (4)" matches what clicking "Low" actually
  // returns. Without this, counts include Archived sections that the gallery
  // default-hides, producing confusing "Low (11)" pills that only deliver 4
  // results. The Lifecycle pill keeps the full distribution since that's the
  // surface for summoning Archived/Deprecated explicitly.
  const countableBase = useMemo(() => {
    if (lifecycle !== ALL) return sections;
    return sections.filter((s) => {
      const sLifecycle = getLifecycle(s);
      return sLifecycle !== "Archived" && sLifecycle !== "Deprecated";
    });
  }, [sections, lifecycle]);

  // Derived filter option lists.
  //
  // Categories are the **canonical 16** (see `@mr/section-library-ui/canonical-categories`).
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
    countableBase.forEach((s) => {
      if (counts.has(s.category)) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
      else other += 1;
    });
    const result = CANONICAL_CATEGORIES.map(c => ({ id: c.id, label: c.label, count: counts.get(c.id) ?? 0 }));
    if (other > 0) result.push({ id: "__other", label: "Uncategorised", count: other });
    return result;
  }, [countableBase]);

  const trackCounts = useMemo(() => {
    const c: Record<string, number> = { stable: 0, experimental: 0, legacy: 0 };
    countableBase.forEach((s) => { const t = (s.track ?? "stable") as Track; c[t] = (c[t] ?? 0) + 1; });
    return c;
  }, [countableBase]);

  // Lifecycle counts use the RAW sections list — this pill is the entry point
  // for summoning Archived / Deprecated, so the count must reflect the full
  // dataset including default-hidden lifecycles.
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
    countableBase.forEach((s) => (s.motionDensity ?? []).forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1)));
    // Sort by MOTION_OPTIONS ordinal (static → experience), not alphabetical,
    // so the popover reads as a scale and matches the curator slider's order.
    const motionOrder = ["static", "low", "medium", "high", "experience"];
    return Array.from(counts.entries())
      .sort(([a], [b]) => motionOrder.indexOf(a) - motionOrder.indexOf(b))
      .map(([id, count]) => ({ id, count }));
  }, [countableBase]);

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    countableBase.forEach((s) => (s.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
  }, [countableBase]);

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
      // Clients are stored as section tags — section matches a client when
      // its tags include the client's name (case-insensitive match).
      if (client !== ALL) {
        const clientLower = client.toLowerCase();
        const matched = (s.tags ?? []).some((t) => t.toLowerCase() === clientLower);
        if (!matched) return false;
      }
      // Project filter — match by section.context (brand-context id). Sections
      // without a context are universal and only appear when "All projects"
      // is selected.
      if (project !== ALL && projectIdFromContextRef(s.context) !== project) return false;
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
  }, [sections, query, client, project, category, track, lifecycle, animation, tag, sort]);

  const filtersDirty = query !== "" || client !== ALL || project !== ALL || category !== ALL || track !== ALL || lifecycle !== ALL || animation !== ALL || tag !== ALL || sort !== "name-asc";

  /** Client filter options — counts how many sections are tagged with each
   * canonical client. All four are always shown so the filter taxonomy
   * stays stable even when no sections are tagged with a particular client. */
  const clientOptions = useMemo(() => {
    return CLIENTS.map((c) => {
      const cLower = c.toLowerCase();
      const count = countableBase.filter((s) => (s.tags ?? []).some((t) => t.toLowerCase() === cLower)).length;
      return { id: c, label: c, count };
    });
  }, [countableBase]);

  /** Project filter options — one row per registered brand context, plus a
   * count of how many currently-visible sections reference it. Skips the
   * marketplace's pseudo-context "_neutral" (not a real project). Each
   * option carries an optional `group` set to its client tag — the FilterPill
   * uses this to render section headings when multiple projects share a
   * client. Per decision-marketplace-frozen-section-bundles, projects own a
   * design system; the client tag is metadata only. */
  const projectOptions = useMemo(() => {
    const usageById = new Map<string, number>();
    for (const s of countableBase) {
      const pid = projectIdFromContextRef(s.context);
      if (pid) usageById.set(pid, (usageById.get(pid) ?? 0) + 1);
    }
    // Sort: projects grouped by client (so Halden Miller LLC's projects
    // cluster together), then alphabetical within each client. Client-less
    // projects sort last under the "~" pseudo-group sentinel.
    const withClient = brandContexts
      .filter((c) => c.id !== "_neutral")
      .map((c) => ({
        id: c.id,
        label: c.name,
        count: usageById.get(c.id) ?? 0,
        _client: c.client ?? "~",
      }))
      .sort((a, b) => {
        const groupCmp = a._client.localeCompare(b._client);
        return groupCmp !== 0 ? groupCmp : a.label.localeCompare(b.label);
      });
    // Strip the sort-key before returning so the FilterOption shape stays clean.
    return withClient.map(({ _client, ...rest }) => rest);
  }, [brandContexts, countableBase]);

  function clearAll() {
    setQuery(""); setClient(ALL); setProject(ALL); setCategory(ALL); setTrack(ALL); setLifecycle(ALL); setAnimation(ALL); setTag(ALL); setSort("name-asc");
  }

  // Card click handler — navigates to the full-page section detail route.
  const openSection = (id: string) => {
    router.push(`/sections/${id}`);
  };

  return (
    <>
      <TopBar
        sections={sections}
        search={{ value: query, onChange: setQuery }}
      />

      <div className="mr-filter-row">
        <FilterPill
          label="Clients"
          icon={<IconCollection />}
          value={client}
          options={[
            { id: ALL, label: "All clients", count: countableBase.length },
            ...clientOptions,
          ]}
          onChange={setClient}
        />

        <FilterPill
          label="Projects"
          icon={<IconCollection />}
          value={project}
          options={[
            { id: ALL, label: "All projects", count: countableBase.length },
            ...projectOptions,
          ]}
          onChange={setProject}
        />

        <FilterPill
          label="Category"
          icon={<IconCategory />}
          value={category}
          options={[{ id: ALL, label: "All categories", count: countableBase.length }, ...categories.map((c) => ({ id: c.id, label: c.label, count: c.count }))]}
          onChange={setCategory}
        />

        <FilterPill
          label="Lifecycle"
          icon={<IconLifecycle />}
          value={lifecycle}
          options={[
            { id: ALL, label: "All lifecycle states", count: countableBase.length },
            ...LIFECYCLES.map((l) => ({
              id: l,
              label: lifecycleLabel(l),
              count: lifecycleCounts[l] ?? 0,
              dot: `var(--mr-lifecycle-${l.toLowerCase()})`,
            })),
          ]}
          onChange={setLifecycle}
        />

        <FilterPill
          label="Animation"
          icon={<IconAnimation />}
          value={animation}
          options={[{ id: ALL, label: "All densities", count: countableBase.length }, ...animationOptions.map((a) => ({ id: a.id, label: capitalize(a.id), count: a.count }))]}
          onChange={setAnimation}
        />

        <FilterPill
          label="Tags"
          icon={<IconTag />}
          value={tag}
          options={[{ id: ALL, label: "All tags", count: countableBase.length }, ...tagOptions.map((t) => ({ id: t.id, label: t.id, count: t.count }))]}
          onChange={setTag}
        />

        <div className="mr-filter-row__spacer" />

        <DensityToggle
          value={density}
          onChange={(n) => setDensity(n as 2 | 3 | 4)}
        />

      </div>

      {filtered.length === 0 ? (
        <div className="mr-empty">
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
        <div className="mr-grid" data-density={density}>
          {filtered.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              lifecycle={getLifecycle(s) as LifecycleName}
              previewSrc={s.previews?.static ? `/preview/${s.id}` : undefined}
              videoSrc={s.previews?.video}
              onOpen={() => openSection(s.id)}
            />
          ))}
        </div>
      )}

    </>
  );
}

