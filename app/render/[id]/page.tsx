/**
 * /render/[id] — self-contained section renderer.
 *
 * The Library App's Preview tab iframes THIS route, same-origin. No
 * dependency on a sibling demo project being online — the marketplace
 * bundles its own copy of the section primitives + a neutral design
 * system (forked from starter-pack as the canonical baseline).
 *
 * Sections live two levels deep: `sections/<category>/<id>/index.tsx`.
 * This page server-resolves the category by scanning, then hands the
 * `cat/id` pair to a client component for `next/dynamic` to expand
 * into one webpack chunk per section.
 *
 * Pipeline: same-origin render → no localhost:3010, no probe, no fallback.
 * The honest "what does this layout look like" against a neutral baseline.
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { SectionsContainer } from "@/components/sections-container";
import { LiveRenderClient } from "./live";

type RouteParams = Promise<{ id: string }>;

const SECTIONS_DIR = path.join(process.cwd(), "sections");

function findCategoryForSection(id: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
  if (!existsSync(SECTIONS_DIR)) return null;
  for (const cat of readdirSync(SECTIONS_DIR)) {
    if (existsSync(path.join(SECTIONS_DIR, cat, id, "index.tsx"))) return cat;
  }
  return null;
}

export default async function RenderPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  const category = findCategoryForSection(id);
  if (!category) notFound();

  return (
    <main className="mr-render-shell">
      <SectionsContainer>
        <Suspense fallback={<div className="mr-render-loading" />}>
          <LiveRenderClient category={category} id={id} />
        </Suspense>
      </SectionsContainer>
    </main>
  );
}
