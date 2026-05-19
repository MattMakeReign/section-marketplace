/**
 * GET  /api/sections   — paginated list of every section in the registry.
 *                       Returns metadata only (no source code, no previews).
 *                       Optionally filters by ?category=, ?track=, ?lifecycle=.
 *
 * POST /api/sections   — submit a new section (or replace an existing one
 *                       when `force: true`). Body is a JSON tree of files
 *                       plus the manifest. Uses Octokit to commit directly
 *                       to the GitHub-hosted repo; the Vercel rebuild that
 *                       follows makes the section live on the public URL.
 *
 * No auth in V2 — team-only model. A future task adds GitHub OAuth on the
 * client side when the marketplace opens up beyond the team.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { Manifest, ManifestEntry } from "@mr/section-library-ui";
import { commitFiles, type FileEntry } from "@/lib/github-commit";

export const dynamic = "force-dynamic";

/* ─────────────────────────── GET ─────────────────────────── */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const track = searchParams.get("track");
  const lifecycle = searchParams.get("lifecycle");
  const q = searchParams.get("q")?.toLowerCase();

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

  let sections: ManifestEntry[] = manifest.sections ?? [];
  if (category) sections = sections.filter((s) => s.category === category);
  if (track)    sections = sections.filter((s) => s.track === track);
  if (lifecycle) sections = sections.filter((s) => (s.lifecycle ?? "Submitted") === lifecycle);
  if (q) {
    sections = sections.filter((s) =>
      s.id.toLowerCase().includes(q)
        || s.name.toLowerCase().includes(q)
        || (s.description ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json({
    ok: true,
    generated: manifest.generated,
    count: sections.length,
    sections,
  });
}

/* ─────────────────────────── POST ─────────────────────────── */

type SubmitBody = {
  /** The marketplace section.json the CLI built. */
  manifest: ManifestEntry;
  /** All files for this section. Paths are SECTION-RELATIVE
   *  (e.g. "section.json", "index.tsx", "preview.png"). */
  files: FileEntry[];
  /** When true, replace an existing section with the same id. */
  force?: boolean;
  /**
   * Optional brand-context bundle. Present when the submitter's project has a
   * design system the marketplace hasn't seen before (or has drifted). The
   * server commits these files into `brand-contexts/<id>/` alongside the
   * section files in the same commit. Paths are RELATIVE TO THE CONTEXT FOLDER
   * (e.g. "context.json", "tokens.css", "fonts.css", "assets/logo.svg").
   */
  brandContext?: {
    id: string;
    files: FileEntry[];
  };
};

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json", error: "Body is not valid JSON." }, { status: 400 });
  }

  const errors = validateSubmitBody(body);
  if (errors.length) {
    return NextResponse.json({ ok: false, code: "invalid_payload", error: errors[0], errors }, { status: 400 });
  }

  const { manifest, files, force, brandContext } = body;

  // Resolve target path inside the repo: sections/<category>/<id>/<file>
  const sectionDir = `sections/${manifest.category}/${manifest.id}`;
  const contextDir = brandContext ? `brand-contexts/${brandContext.id}` : null;

  // Pre-flight: existence check against the local index.json (best-effort —
  // the bundled manifest is what Vercel built at last deploy, so a section
  // submitted seconds ago won't appear here yet. Worst case: two near-
  // simultaneous submissions race; Octokit's update-ref will reject the
  // second one with a fast-forward error and we surface that.).
  if (!force) {
    try {
      const raw = await readFile(path.join(process.cwd(), "index.json"), "utf8");
      const idx = JSON.parse(raw) as Manifest;
      if ((idx.sections ?? []).some((s) => s.id === manifest.id)) {
        return NextResponse.json(
          { ok: false, code: "already_exists", error: `Section "${manifest.id}" already exists. Pass force: true to replace.` },
          { status: 409 },
        );
      }
    } catch {
      // No index.json yet — treat as empty.
    }
  }

  // Build the file list for the commit. Caller-supplied paths are
  // SECTION-RELATIVE; we prefix with sections/<category>/<id>/.
  const repoFiles: FileEntry[] = files.map((f) => ({
    path: `${sectionDir}/${stripLeadingSlash(f.path)}`,
    encoding: f.encoding,
    content: f.content,
  }));

  // Ensure section.json is always written (carries the canonical manifest).
  if (!repoFiles.some((f) => f.path.endsWith("/section.json"))) {
    repoFiles.push({
      path: `${sectionDir}/section.json`,
      encoding: "utf8",
      content: JSON.stringify(manifest, null, 2) + "\n",
    });
  }

  // Append brand-context bundle files if the submission carries one. Same
  // commit as the section so the section + its context land atomically.
  if (brandContext && contextDir) {
    for (const f of brandContext.files) {
      repoFiles.push({
        path: `${contextDir}/${stripLeadingSlash(f.path)}`,
        encoding: f.encoding,
        content: f.content,
      });
    }
  }

  try {
    const result = await commitFiles({
      files: repoFiles,
      message: brandContext
        ? `Submit ${manifest.id} (${manifest.category}) + brand-context ${brandContext.id}`
        : `Submit ${manifest.id} (${manifest.category})`,
      authorName: manifest.submittedBy ?? "MakeReign Marketplace",
      authorEmail: "marketplace@makereign.com",
    });
    return NextResponse.json({
      ok: true,
      id: manifest.id,
      lifecycle: manifest.lifecycle ?? "Submitted",
      commit: { sha: result.commitSha, url: result.commitUrl, branch: result.branch },
      // Vercel rebuild is async — surface the URL anyway so the CLI can
      // construct a polling/refresh prompt if it wants.
      siteUrl: getCanonicalSiteUrl(),
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

/* ─────────────────────────── helpers ─────────────────────────── */

function validateSubmitBody(body: unknown): string[] {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    errors.push("Body must be a JSON object.");
    return errors;
  }
  const b = body as Partial<SubmitBody>;
  if (!b.manifest || typeof b.manifest !== "object") errors.push("manifest is required.");
  if (!Array.isArray(b.files) || b.files.length === 0) errors.push("files must be a non-empty array.");
  const m = b.manifest as ManifestEntry | undefined;
  if (m) {
    if (typeof m.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.id)) errors.push(`manifest.id must be lowercase-hyphenated (got: ${m.id ?? "missing"}).`);
    if (typeof m.name !== "string" || m.name.length < 1) errors.push("manifest.name is required.");
    if (typeof m.category !== "string" || m.category.trim().length === 0) errors.push("manifest.category is required.");
    if (typeof m.version !== "string") errors.push("manifest.version is required.");
  }
  if (Array.isArray(b.files)) {
    for (let i = 0; i < b.files.length; i++) {
      const f = b.files[i];
      if (!f || typeof f.path !== "string") { errors.push(`files[${i}].path is required.`); continue; }
      if (f.path.includes("..") || f.path.startsWith("/")) { errors.push(`files[${i}].path is not allowed.`); continue; }
      if (f.encoding !== "utf8" && f.encoding !== "base64") { errors.push(`files[${i}].encoding must be "utf8" or "base64".`); continue; }
      if (typeof f.content !== "string") errors.push(`files[${i}].content must be a string.`);
    }
  }
  if (b.brandContext != null) {
    const bc = b.brandContext as { id?: unknown; files?: unknown };
    if (typeof bc.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bc.id as string)) {
      errors.push("brandContext.id must be lowercase-hyphenated.");
    }
    if (!Array.isArray(bc.files) || bc.files.length === 0) {
      errors.push("brandContext.files must be a non-empty array.");
    } else {
      for (let i = 0; i < bc.files.length; i++) {
        const f = (bc.files as Array<{ path?: unknown; encoding?: unknown; content?: unknown }>)[i];
        if (!f || typeof f.path !== "string") { errors.push(`brandContext.files[${i}].path is required.`); continue; }
        if ((f.path as string).includes("..") || (f.path as string).startsWith("/")) { errors.push(`brandContext.files[${i}].path is not allowed.`); continue; }
        if (f.encoding !== "utf8" && f.encoding !== "base64") { errors.push(`brandContext.files[${i}].encoding must be "utf8" or "base64".`); continue; }
        if (typeof f.content !== "string") errors.push(`brandContext.files[${i}].content must be a string.`);
      }
    }
  }
  return errors;
}

function stripLeadingSlash(p: string) {
  return p.startsWith("/") ? p.slice(1) : p;
}

function getCanonicalSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://section-marketplace.vercel.app");
}
