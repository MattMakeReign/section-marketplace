/**
 * GET /api/sections/:id/assets
 *
 * Returns the list of image asset URLs bundled with a section. Used by the
 * detail viewer to pre-fetch ALL neighbouring sections' images on mount, so
 * navigating prev/next is instant — images are already in the browser cache
 * by the time the iframe loads them.
 *
 * Lookup mirrors `app/api/section-asset/[id]/[file]/route.ts`: read the
 * manifest to find the section's path, then list image files inside
 * `<entry.path>/assets/`.
 *
 * Response: { ok: true, urls: string[] }
 *   - Each URL is the public `/api/section-asset/<id>/<file>` route the
 *     section's <img> tags resolve to, so prefetching primes the same cache
 *     key the iframe will hit on load.
 */

import { readdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { Manifest, ManifestEntry } from "@mr/section-library-ui";

export const dynamic = "force-dynamic";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);

function safeSegment(segment: string): boolean {
  return (
    typeof segment === "string" &&
    segment.length > 0 &&
    !segment.includes("..") &&
    !segment.includes("/") &&
    !segment.includes("\\") &&
    !segment.startsWith(".")
  );
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!safeSegment(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  let manifest: Manifest;
  try {
    const raw = await readFile(path.join(process.cwd(), "index.json"), "utf8");
    manifest = JSON.parse(raw) as Manifest;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "manifest_missing", message: (err as Error).message },
      { status: 500 },
    );
  }

  const entry = (manifest.sections ?? []).find((s: ManifestEntry) => s.id === id);
  if (!entry || typeof entry.path !== "string") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const assetsDir = path.join(process.cwd(), entry.path, "assets");
  let files: string[] = [];
  try {
    files = await readdir(assetsDir);
  } catch {
    // No assets dir → no images. Return an empty list rather than 404 so the
    // viewer's prefetch loop can treat "no assets" the same as "assets are
    // already cached".
    return NextResponse.json({ ok: true, urls: [] });
  }

  const urls = files
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => `/api/section-asset/${id}/${f}`);

  return NextResponse.json(
    { ok: true, urls },
    {
      headers: {
        // Browser-cache the asset LIST for a few minutes; the underlying
        // files are versioned by URL so updates show up regardless.
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
