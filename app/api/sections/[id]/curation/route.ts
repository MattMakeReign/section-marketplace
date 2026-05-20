/**
 * PUT /api/sections/[id]/curation
 *
 * Save curator edits for a section. Slimmed in promotion-system-v2 (2026-05-19):
 * was a fat endpoint that merged a `curation` object (8 fields + composition)
 * and round-tripped 4 named H2 prose sections in README.md. Now: accepts only
 * the load-bearing fields used by the UI + AI consumers.
 *
 * Writes section.json via the Octokit pipeline (works in Vercel production —
 * the previous local writeFile pattern only worked in dev).
 *
 * Request body:
 *   {
 *     description?: string,           // ≥ 20 chars
 *     tags?: string[],                // 0–6 short kebab-case keywords
 *     motionDensity?: string[],       // subset of [static, low, medium, high, experience]
 *     category?: string,              // canonical category
 *     previewVideoUrl?: string | null // Supabase Storage URL; null to remove
 *   }
 *
 * Response: { ok: true, section: ManifestEntry } | { ok: false, error, code }
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  isCanonicalCategory,
  type ManifestEntry,
  type Manifest,
} from "@mr/section-library-ui";
import { commitFiles, type FileEntry } from "@/lib/github-commit";

export const dynamic = "force-dynamic";

type IndexJson = Manifest & { sections?: ManifestEntry[] };

const ALLOWED_MOTION = new Set(["static", "low", "medium", "high", "experience"]);

function isoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Body = {
  description?: string;
  tags?: string[];
  motionDensity?: string[];
  category?: string;
  previewVideoUrl?: string | null;
};

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body", code: "invalid_args" },
      { status: 400 },
    );
  }

  // Reject the legacy fat shape loud — protects against stale clients that
  // try to round-trip the dropped curation object or prose payload.
  const legacyKeys = ["curation", "prose"].filter((k) => k in (body as Record<string, unknown>));
  if (legacyKeys.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `legacy fields no longer accepted: ${legacyKeys.join(", ")}. Update your client.`,
        code: "schema_mismatch",
      },
      { status: 400 },
    );
  }

  // Validate inputs.
  if (typeof body.description === "string" && body.description.trim().length < 20) {
    return NextResponse.json(
      {
        ok: false,
        error: "description must be at least 20 characters",
        code: "invalid_args",
      },
      { status: 400 },
    );
  }
  if (typeof body.category === "string" && !isCanonicalCategory(body.category)) {
    return NextResponse.json(
      {
        ok: false,
        error: `category "${body.category}" is not one of the 16 canonical Library categories`,
        code: "invalid_category",
      },
      { status: 400 },
    );
  }
  if (Array.isArray(body.motionDensity)) {
    const bad = body.motionDensity.filter((m) => !ALLOWED_MOTION.has(m));
    if (bad.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `motionDensity has unknown values: ${bad.join(", ")}`,
          code: "invalid_args",
        },
        { status: 400 },
      );
    }
  }
  if (
    body.previewVideoUrl !== undefined &&
    body.previewVideoUrl !== null &&
    (typeof body.previewVideoUrl !== "string" || body.previewVideoUrl.length === 0)
  ) {
    return NextResponse.json(
      { ok: false, error: "previewVideoUrl must be a URL or null", code: "invalid_args" },
      { status: 400 },
    );
  }

  // Locate the section's path via index.json.
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
      { ok: false, error: `section "${id}" not found`, code: "not_found" },
      { status: 404 },
    );
  }

  // Load fresh section.json from disk.
  const sectionJsonRepoPath = `${entry.path}/section.json`;
  const sectionJsonAbsPath = path.join(root, sectionJsonRepoPath);
  let sectionManifest: ManifestEntry & Record<string, unknown>;
  try {
    sectionManifest = JSON.parse(await readFile(sectionJsonAbsPath, "utf8")) as ManifestEntry &
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

  // Apply the slim updates.
  const today = isoDate();
  if (typeof body.description === "string") sectionManifest.description = body.description.trim();
  if (Array.isArray(body.tags)) sectionManifest.tags = body.tags;
  if (Array.isArray(body.motionDensity)) sectionManifest.motionDensity = body.motionDensity;
  if (typeof body.category === "string") sectionManifest.category = body.category;
  if (body.previewVideoUrl !== undefined) {
    const previews = (sectionManifest.previews ?? {}) as Record<string, unknown>;
    if (body.previewVideoUrl === null) {
      delete previews.video;
    } else {
      previews.video = body.previewVideoUrl;
    }
    sectionManifest.previews = previews;
  }
  sectionManifest.updated = today;

  // Commit via Octokit — works in Vercel production (read-only fs).
  const file: FileEntry = {
    path: sectionJsonRepoPath,
    encoding: "utf8",
    content: JSON.stringify(sectionManifest, null, 2) + "\n",
  };
  try {
    const result = await commitFiles({
      files: [file],
      message: `Curation ${id}: update metadata`,
      authorName: "MakeReign Marketplace",
      authorEmail: "marketplace@makereign.com",
    });
    return NextResponse.json({
      ok: true,
      section: {
        ...entry,
        description: sectionManifest.description as string | undefined,
        tags: sectionManifest.tags as string[] | undefined,
        motionDensity: sectionManifest.motionDensity as string[] | undefined,
        category: sectionManifest.category,
        previews: sectionManifest.previews as ManifestEntry["previews"],
        updated: today,
      },
      commit: { sha: result.commitSha, url: result.commitUrl, branch: result.branch },
    });
  } catch (err: unknown) {
    const msg = (err as Error).message ?? String(err);
    const status = msg.includes("GITHUB_TOKEN") ? 500 : 502;
    return NextResponse.json(
      { ok: false, code: "commit_failed", error: msg },
      { status },
    );
  }
}
