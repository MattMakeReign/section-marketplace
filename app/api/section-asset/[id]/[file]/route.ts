/**
 * GET /api/section-asset/:id/:file
 *
 * Marketplace twin of the project-level section-asset route. Streams an asset
 * (image / video poster / etc) out of the marketplace's bundled section tree
 * so the `/render/[id]` preview shell can resolve URLs that sections produce
 * via `assetUrl(filename)` = `/api/section-asset/<id>/<file>`.
 *
 * Lookup pattern (mirrors `app/api/sections/[id]/bundle/route.ts`):
 *   1. Read `index.json` to find the section entry by id.
 *   2. Resolve `<entry.path>/assets/<file>` against `process.cwd()`.
 *   3. Stream the bytes with the right Content-Type, `Cache-Control: no-store`.
 *
 * Sections co-locate their assets in `sections/<category>/<id>/assets/<file>`
 * (committed at submit time by the API's GitHub commit pipeline). The same
 * binaries also ride along to destination projects via `mr add`, where each
 * project's local copy of this route serves them from its own filesystem.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { Manifest, ManifestEntry } from "@mr/section-library-ui";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

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
  ctx: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await ctx.params;

  if (!safeSegment(id) || !safeSegment(file)) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  const ext = path.extname(file).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 415 });
  }

  // Resolve the section's bundled folder via the manifest, same as the
  // bundle route. Marketplace stores sections at sections/<category>/<id>/,
  // so we can't assume a fixed layout — index.json is the source of truth.
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

  const entry: ManifestEntry | undefined = (manifest.sections ?? []).find((s) => s.id === id);
  if (!entry || typeof entry.path !== "string") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), entry.path, "assets", file);

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: (err as Error).message },
      { status: 404 },
    );
  }
}
