/**
 * POST /api/sections/[id]/lifecycle
 *
 * Curator-only endpoint that walks a section through its lifecycle states.
 * Writes the new state to the section's own `section.json` AND patches the
 * marketplace `index.json` in-place so the Library App reflects the move on
 * the next request without needing a full `pnpm build`.
 *
 * The state machine lives in `@mr/section-library-ui/lifecycle-transitions` —
 * server-side validation rejects transitions the machine doesn't allow, so a
 * hand-rolled request can't write an arbitrary lifecycle value.
 *
 * No auth in v1 — this is local-dev curation only. When the Library App goes
 * remote a real auth gate slots in front of this handler.
 *
 * Request body: { to: Lifecycle, note?: string }
 * Response:     { ok: true, section: ManifestEntry } | { ok: false, error, code }
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getLifecycle,
  isValidTransition,
  LIFECYCLES,
  type Lifecycle,
  type ManifestEntry,
  type Manifest,
} from "@mr/section-library-ui";

type IndexJson = Manifest & { sections?: ManifestEntry[] };

function isLifecycle(value: unknown): value is Lifecycle {
  return typeof value === "string" && (LIFECYCLES as string[]).includes(value);
}

function isoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  let body: { to?: unknown };
  try {
    body = (await req.json()) as { to?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body", code: "invalid_args" }, { status: 400 });
  }

  if (!isLifecycle(body.to)) {
    return NextResponse.json(
      { ok: false, error: `\"to\" must be one of: ${LIFECYCLES.join(", ")}`, code: "invalid_args" },
      { status: 400 },
    );
  }
  const target: Lifecycle = body.to;

  // Read the marketplace index to find the section's on-disk path. cwd is
  // the marketplace repo root (the Next app is rooted there).
  const root = process.cwd();
  const indexPath = path.join(root, "index.json");
  let index: IndexJson;
  try {
    index = JSON.parse(await readFile(indexPath, "utf8")) as IndexJson;
  } catch {
    return NextResponse.json(
      { ok: false, error: "index.json missing — run `pnpm build`", code: "not_found" },
      { status: 500 },
    );
  }

  const entry = (index.sections ?? []).find((s) => s.id === id);
  if (!entry || typeof entry.path !== "string") {
    return NextResponse.json(
      { ok: false, error: `section "${id}" not found in marketplace`, code: "not_found" },
      { status: 404 },
    );
  }

  const current = getLifecycle(entry);
  if (current === target) {
    return NextResponse.json({ ok: true, section: entry, unchanged: true });
  }
  if (!isValidTransition(current, target)) {
    return NextResponse.json(
      {
        ok: false,
        error: `cannot move from ${current} to ${target}`,
        code: "invalid_transition",
      },
      { status: 409 },
    );
  }

  // Update the section's own section.json.
  const sectionJsonPath = path.join(root, entry.path, "section.json");
  let sectionManifest: ManifestEntry & Record<string, unknown>;
  try {
    sectionManifest = JSON.parse(await readFile(sectionJsonPath, "utf8")) as ManifestEntry &
      Record<string, unknown>;
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `could not parse ${entry.path}/section.json: ${(e as Error).message}`,
        code: "invalid_section_json",
      },
      { status: 500 },
    );
  }

  const today = isoDate();
  sectionManifest.lifecycle = target;
  sectionManifest.updated = today;

  // Stamp `promotedAt` the first time a section reaches Promoted. Preserve
  // existing attribution fields; only fill what's missing.
  if (target === "Promoted") {
    const attribution = (sectionManifest.attribution ?? {}) as Record<string, unknown>;
    if (!attribution.promotedAt) {
      sectionManifest.attribution = { ...attribution, promotedAt: today };
    }
  }

  try {
    await writeFile(sectionJsonPath, JSON.stringify(sectionManifest, null, 2) + "\n", "utf8");
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `could not write section.json: ${(e as Error).message}`, code: "write_failed" },
      { status: 500 },
    );
  }

  // Patch the index entry in place so the Library App reflects the move on
  // the next request. Same pattern `updateSectionPreview` uses for previews.
  entry.lifecycle = target;
  entry.updated = today;
  if (target === "Promoted" && sectionManifest.attribution) {
    entry.attribution = sectionManifest.attribution as ManifestEntry["attribution"];
  }
  index.generated = new Date().toISOString();
  await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");

  return NextResponse.json({ ok: true, section: entry });
}
