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
 * BRAND CONTEXT — sections may reference a brand-context in their
 * `section.json.context` field. When present, this page server-loads the
 * context's tokens.css (already scoped to `[data-section-context="<id>"]`)
 * and injects it as a `<style>` tag, then tags the render shell with the
 * matching `data-section-context` attribute. Variables cascade from the
 * shell down into the section, overriding the marketplace's global `:root`.
 * Tailwind utilities generated from `@theme` resolve those variables at
 * runtime, so brand styling reaches both raw CSS and utility classes.
 *
 * Pipeline: same-origin render → no localhost:3010, no probe, no fallback.
 * The honest "what does this layout look like" against the curator's
 * authored context, or the neutral baseline if none.
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { SectionsContainer } from "@/components/sections-container";
import { LiveRenderClient } from "./live";
import { resolveBrandContext, type ResolvedBrandContext } from "@/lib/brand-contexts";

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

function readSectionContext(category: string, id: string): string | null {
  const manifestPath = path.join(SECTIONS_DIR, category, id, "section.json");
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as { context?: string | null };
    return typeof parsed.context === "string" ? parsed.context : null;
  } catch {
    return null;
  }
}

export default async function RenderPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  const category = findCategoryForSection(id);
  if (!category) notFound();

  const contextRef = readSectionContext(category, id);
  const context: ResolvedBrandContext | null = resolveBrandContext(contextRef);

  return (
    <>
      {context?.tokensCss ? (
        <style
          data-brand-context={context.id}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: context.tokensCss }}
        />
      ) : null}
      {context?.fontsCss ? (
        <style
          data-brand-context-fonts={context.id}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: context.fontsCss }}
        />
      ) : null}
      <main
        className="mr-render-shell"
        data-section-context={context?.id ?? undefined}
      >
        <SectionsContainer>
          <Suspense fallback={<div className="mr-render-loading" />}>
            <LiveRenderClient category={category} id={id} />
          </Suspense>
        </SectionsContainer>
      </main>
    </>
  );
}
