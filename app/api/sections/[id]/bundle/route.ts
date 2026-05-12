/**
 * GET /api/sections/[id]/bundle
 *
 * Returns ALL files for a single section as a JSON tree the client can write
 * straight to disk. Text files use utf8; binary (preview.png) is base64.
 *
 * Used by `mr add <id>` in the V2 API-mode client — the workspace fetches a
 * single section's bundle, writes it into the project's `sections/<id>/`
 * folder, and that's it. No marketplace clone on the designer's machine.
 *
 * Reads from the local filesystem (the marketplace's bundled-at-build-time
 * `sections/` tree) — works on Vercel because the repo content is included
 * in the build output.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { Manifest, ManifestEntry } from "@mr/section-library-ui";

export const dynamic = "force-dynamic";

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".otf"]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1. Look up the section in the manifest to find its folder.
  let manifest: Manifest;
  try {
    const raw = await readFile(path.join(process.cwd(), "index.json"), "utf8");
    manifest = JSON.parse(raw) as Manifest;
  } catch (err) {
    return NextResponse.json(
      { ok: false, code: "manifest_missing", error: `Couldn't read index.json: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  const entry: ManifestEntry | undefined = (manifest.sections ?? []).find((s) => s.id === id);
  if (!entry || typeof entry.path !== "string") {
    return NextResponse.json({ ok: false, code: "not_found", error: `No section "${id}" in the marketplace.` }, { status: 404 });
  }

  const sectionDir = path.join(process.cwd(), entry.path);

  // 2. Walk the section folder, returning every file.
  let files;
  try {
    files = await collectFiles(sectionDir, sectionDir);
  } catch (err) {
    return NextResponse.json(
      { ok: false, code: "read_failed", error: `Couldn't read section folder: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: entry.id,
    manifest: entry,
    files,
  });
}

type Collected = { path: string; encoding: "utf8" | "base64"; content: string };

async function collectFiles(rootDir: string, currentDir: string): Promise<Collected[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const out: Collected[] = [];
  for (const e of entries) {
    const full = path.join(currentDir, e.name);
    if (e.isDirectory()) {
      const nested = await collectFiles(rootDir, full);
      out.push(...nested);
      continue;
    }
    const st = await stat(full);
    // Cap any single file at 5MB to keep responses sane; preview PNGs are
    // typically <300KB so this only triggers on bad data.
    if (st.size > 5 * 1024 * 1024) continue;
    const relPath = path.relative(rootDir, full).split(path.sep).join("/");
    const ext = path.extname(full).toLowerCase();
    if (BINARY_EXT.has(ext)) {
      const buf = await readFile(full);
      out.push({ path: relPath, encoding: "base64", content: buf.toString("base64") });
    } else {
      const text = await readFile(full, "utf8");
      out.push({ path: relPath, encoding: "utf8", content: text });
    }
  }
  return out;
}
