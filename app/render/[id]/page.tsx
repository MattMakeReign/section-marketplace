/**
 * /render/[id] — self-contained section renderer.
 *
 * The Library App's Preview tab iframes THIS route, same-origin. Per
 * `decision-marketplace-frozen-section-bundles` (2026-05-21), each section
 * travels with its own pre-compiled CSS bundle (`sections/<cat>/<id>/
 * compiled.css`) produced at submit time inside the source project's
 * Tailwind build. The marketplace renders sections PIXEL-IDENTICAL to their
 * origin project — we just inline the compiled CSS as a <style> tag and
 * let the browser render the React component on top of it. No brand-context
 * CSS injection, no scoped wrappers, no neutral baseline transformation.
 *
 * Sections live two levels deep: `sections/<category>/<id>/index.tsx`. This
 * page server-resolves the category by scanning, then hands the `cat/id`
 * pair to a client component for `next/dynamic` to expand into one webpack
 * chunk per section.
 *
 * If the section ships an `editor.tsx` (the dialkit controller it travelled
 * with from its source project), the client mounts <SectionEditorMount> so
 * the marketplace preview shows the EXACT SAME dialkit panel the user will
 * get when they install the section into a new project. sample.json
 * provides the defaults — same bytes the section was last saved with.
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

function readSectionName(category: string, id: string): string {
  const manifestPath = path.join(SECTIONS_DIR, category, id, "section.json");
  if (!existsSync(manifestPath)) return id;
  try {
    const raw = readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: string };
    return typeof parsed.name === "string" && parsed.name ? parsed.name : id;
  } catch {
    return id;
  }
}

function readCompiledCss(category: string, id: string): string | null {
  const cssPath = path.join(SECTIONS_DIR, category, id, "compiled.css");
  if (!existsSync(cssPath)) return null;
  try {
    return readFileSync(cssPath, "utf8");
  } catch {
    return null;
  }
}

function readSampleProps(
  category: string,
  id: string,
): Record<string, unknown> | null {
  const samplePath = path.join(SECTIONS_DIR, category, id, "sample.json");
  if (!existsSync(samplePath)) return null;
  try {
    const raw = readFileSync(samplePath, "utf8");
    const parsed = JSON.parse(raw) as { props?: Record<string, unknown> };
    return parsed?.props && typeof parsed.props === "object" ? parsed.props : null;
  } catch {
    return null;
  }
}

function hasEditor(category: string, id: string): boolean {
  return existsSync(path.join(SECTIONS_DIR, category, id, "editor.tsx"));
}

export default async function RenderPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  const category = findCategoryForSection(id);
  if (!category) notFound();

  const contextRef = readSectionContext(category, id);
  const compiledCss = readCompiledCss(category, id);
  const sampleProps = readSampleProps(category, id);
  const editorAvailable = hasEditor(category, id);
  const sectionName = readSectionName(category, id);

  return (
    <>
      {/* Section's frozen Tailwind build — same bytes that the source
       * project's CSS pipeline emitted at submit time. Pixel-identical
       * to the origin. Inlined so there's no second round trip and no
       * dependency on serving from public/. */}
      {compiledCss ? (
        <style
          data-section-css={id}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: compiledCss }}
        />
      ) : null}
      <main
        className="mr-render-shell"
        data-section-context={contextRef ?? undefined}
        data-has-compiled-css={compiledCss ? "true" : "false"}
      >
        <SectionsContainer>
          <Suspense fallback={<div className="mr-render-loading" />}>
            <LiveRenderClient
              category={category}
              id={id}
              label={sectionName}
              defaultProps={sampleProps}
              editorAvailable={editorAvailable}
            />
          </Suspense>
        </SectionsContainer>
      </main>
    </>
  );
}
