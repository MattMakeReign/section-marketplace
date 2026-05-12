/**
 * /sections/[id]/edit — Curator enrichment form.
 *
 * Server component: loads the section's manifest entry from `index.json` and
 * its current `README.md` prose, hands them to the client form.
 *
 * Gated by `?mode=curate`. Visitors hitting this URL without it see the same
 * "curator only" lockout as `/review`.
 */

import path from "node:path";
import { readFile } from "node:fs/promises";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadManifest } from "../../../marketplace-data";
import {
  README_PROSE_SECTIONS,
  type ProseSections,
  type ReadmeProseKey,
} from "@mr/section-library-ui";
import { EnrichmentForm } from "./form";

type SearchParams = Promise<{ mode?: string }>;
type RouteParams = Promise<{ id: string }>;

/**
 * Pull each curator-managed H2 section out of the existing README so the
 * form can prefill. Round-trips through the same heading list the save
 * endpoint uses, keeping read + write symmetric.
 */
function parseProseSections(readmeSource: string): ProseSections {
  const lines = readmeSource.split("\n");
  type Section = { heading: string; start: number; end: number };
  const sections: Section[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    sections.push({ heading: m[1].trim(), start: i, end: lines.length });
  }
  for (let i = 0; i < sections.length; i++) {
    if (i + 1 < sections.length) sections[i].end = sections[i + 1].start;
  }
  const out: ProseSections = {};
  for (const s of README_PROSE_SECTIONS) {
    const match = sections.find((x) => x.heading.toLowerCase() === s.heading.toLowerCase());
    if (!match) continue;
    const body = lines.slice(match.start + 1, match.end).join("\n").trim();
    out[s.key as ReadmeProseKey] = body;
  }
  return out;
}

export default async function EditSectionPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const curatorMode = mode === "curate";

  if (!curatorMode) {
    return (
      <>
        <header className="mr-mk-topbar">
          <div className="mr-mk-topbar__brand">
            <span className="mr-mk-topbar__sub">MakeReign</span>
            <Link href="/" className="mr-mk-topbar__wordmark">Section Library</Link>
          </div>
        </header>
        <section className="mr-mk-header">
          <div className="mr-mk-header__eyebrow">Curator only</div>
          <h1 className="mr-mk-header__title">
            Enrichment is <em>curator-only.</em>
          </h1>
          <p className="mr-mk-header__sub">
            Open this page with <code>?mode=curate</code> in the URL to access the editor.
          </p>
        </section>
      </>
    );
  }

  const manifest = await loadManifest();
  const section = (manifest.sections ?? []).find((s) => s.id === id);
  if (!section || typeof section.path !== "string") notFound();

  // Load README — empty string if missing; the form scaffolds prose on save.
  const readmePath = path.join(process.cwd(), section.path, "README.md");
  let readmeSource = "";
  try {
    readmeSource = await readFile(readmePath, "utf8");
  } catch {
    // Missing README — leave empty. Form will start the prose sections blank.
  }
  const initialProse = parseProseSections(readmeSource);

  return (
    <>
      <header className="mr-mk-topbar">
        <div className="mr-mk-topbar__brand">
          <span className="mr-mk-topbar__sub">MakeReign</span>
          <Link href={`/?mode=curate`} className="mr-mk-topbar__wordmark">Section Library</Link>
          <span className="mr-mk-curator-flag">Curator mode</span>
        </div>
        <nav className="mr-mk-topbar__nav">
          <Link href={`/?mode=curate`} className="mr-mk-topbar__navlink">Catalogue</Link>
          <Link href={`/review?mode=curate`} className="mr-mk-topbar__navlink">Review queue</Link>
        </nav>
      </header>

      <EnrichmentForm section={section} initialProse={initialProse} />
    </>
  );
}
