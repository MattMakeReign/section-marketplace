/**
 * POST /api/sections/[id]/draft-curation
 *
 * Curator-only endpoint. Reads the section's source (index.tsx + README.md +
 * section.json) plus its captured preview PNG, hands them to Claude, returns
 * a structured DRAFT of the curator-owned metadata.
 *
 * Does NOT save anything. The curator reviews the draft in the EnrichmentForm
 * and accepts / edits / rejects per field before saving via the existing
 * `PUT /api/sections/[id]/curation`.
 *
 * Response:
 *   { ok: true, curation, prose, modelUsed, tokenUsage }
 *   | { ok: false, error: string, code: string }
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { loadManifest } from "../../../../marketplace-data";
import { draftCuration, AIDraftError } from "../../../../../lib/ai-draft-curation";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  const manifest = await loadManifest();
  const entry = (manifest.sections ?? []).find((s) => s.id === id);
  if (!entry || typeof entry.path !== "string") {
    return NextResponse.json(
      { ok: false, error: `section "${id}" not found`, code: "not_found" },
      { status: 404 },
    );
  }

  const sectionDir = path.join(process.cwd(), entry.path);

  // Read the three text inputs in parallel; tolerate missing README.
  const [source, readme] = await Promise.all([
    readFile(path.join(sectionDir, "index.tsx"), "utf8").catch(() => ""),
    readFile(path.join(sectionDir, "README.md"), "utf8").catch(() => ""),
  ]);

  if (source.length === 0) {
    return NextResponse.json(
      { ok: false, error: `section "${id}" is missing index.tsx`, code: "no_source" },
      { status: 422 },
    );
  }

  // Optional: pull the preview PNG for vision context. Skip if it's the
  // 1×1 transparent scaffold (less than 200 bytes) — sending that adds tokens
  // without adding signal.
  let previewPng: Buffer | undefined;
  if (entry.previews?.static && entry.previews.static.toLowerCase().endsWith(".png")) {
    try {
      const buf = await readFile(path.join(sectionDir, entry.previews.static));
      if (buf.byteLength > 200) previewPng = buf;
    } catch {
      // Missing or unreadable preview — fall through without it.
    }
  }

  try {
    const result = await draftCuration({
      sectionId: id,
      sectionName: entry.name,
      category: entry.category,
      description: entry.description ?? "",
      source,
      readme,
      previewPng,
    });
    return NextResponse.json({
      ok: true,
      curation: result.curation,
      prose: result.prose,
      modelUsed: result.modelUsed,
      tokenUsage: result.tokenUsage,
    });
  } catch (err) {
    if (err instanceof AIDraftError) {
      const status = err.code === "key_not_configured" ? 503 : err.code === "invalid_key" ? 401 : err.code === "rate_limited" ? 429 : 500;
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status });
    }
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? String(err), code: "internal_error" },
      { status: 500 },
    );
  }
}
