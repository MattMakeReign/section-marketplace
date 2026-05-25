/**
 * DELETE /api/sections/[id]/delete
 *
 * Permanently removes a section from the marketplace — source files, manifest,
 * README, assets — everything under the section's `entry.path`. Mirror of the
 * lifecycle route but committing tree entries with `sha: null` via
 * `deleteFiles()` in `lib/github-commit.ts`.
 *
 * Guard (defense in depth — the UI also enforces it):
 *   - Body must contain `{ confirm: "<section-id>" }` — typed-id confirmation,
 *     same pattern git uses for `--force` on protected branches. Saves the
 *     designer from a fat-fingered fetch. Delete is available regardless of
 *     lifecycle — Archive and Delete are sibling actions in the kebab menu.
 *
 * Not in scope (deliberate):
 *   - Supabase preview cleanup. `previews.video` / `previews.static` URLs are
 *     left orphaned on Supabase Storage. A follow-up wires deletion if storage
 *     cost becomes a concern.
 *   - Undelete. Recovery path is `git revert` on the resulting commit.
 *
 * No auth in V2 — team-only model, same envelope as lifecycle + curation.
 *
 * Request body: { confirm: string }   // must equal :id
 * Response:     { ok: true, deleted, fileCount, commit } | { ok: false, error, code }
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  type ManifestEntry,
  type Manifest,
} from "@mr/section-library-ui";
import { deleteFiles, getOctokit, getRepoIdentity } from "@/lib/github-commit";

export const dynamic = "force-dynamic";

type IndexJson = Manifest & { sections?: ManifestEntry[] };

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  let body: { confirm?: unknown };
  try {
    body = (await req.json()) as { confirm?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body", code: "invalid_args" },
      { status: 400 },
    );
  }

  if (body.confirm !== id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Type the section id in `confirm` to delete",
        code: "confirm_required",
      },
      { status: 400 },
    );
  }

  // Locate the section's on-disk path via index.json — same pattern as
  // lifecycle + curation.
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

  // Enumerate every file under the section's dir. In production the fs is
  // read-only, so we walk the GitHub tree via Octokit. Locally we walk disk.
  const sectionDir = entry.path;
  let paths: string[];
  try {
    paths = await enumerateSectionPaths(sectionDir);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `failed to enumerate section files: ${(e as Error).message}`,
        code: "enumeration_failed",
      },
      { status: 500 },
    );
  }
  // Idempotency: if the section's files are already gone from the tree (a
  // previous delete already landed; the build's index.json just hasn't caught
  // up yet), treat the call as success. Lets the curator UI optimistically
  // hide the card without surfacing a confusing red error on retry.
  if (paths.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: sectionDir,
      fileCount: 0,
      alreadyDeleted: true,
    });
  }

  try {
    const result = await deleteFiles({
      paths,
      message: `Delete section: ${id}`,
      authorName: "MakeReign Marketplace",
      authorEmail: "marketplace@makereign.com",
    });
    return NextResponse.json({
      ok: true,
      deleted: sectionDir,
      fileCount: paths.length,
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

/**
 * Walks the section's directory and returns every file path inside it,
 * relative to repo root. Uses Octokit's recursive tree API in production
 * (read-only fs), and `fs.readdir` recursion locally.
 */
async function enumerateSectionPaths(sectionDir: string): Promise<string[]> {
  if (process.env.GITHUB_TOKEN) {
    const octokit = getOctokit();
    const { owner, repo, branch } = getRepoIdentity();
    const refResp = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const commitSha = refResp.data.object.sha;
    const commitResp = await octokit.git.getCommit({ owner, repo, commit_sha: commitSha });
    const treeSha = commitResp.data.tree.sha;
    const treeResp = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "1",
    });
    const prefix = sectionDir.endsWith("/") ? sectionDir : sectionDir + "/";
    return treeResp.data.tree
      .filter(
        (t) =>
          t.type === "blob" &&
          typeof t.path === "string" &&
          t.path.startsWith(prefix),
      )
      .map((t) => t.path as string);
  }

  const root = process.cwd();
  const abs = path.join(root, sectionDir);
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) {
        out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  }
  await walk(abs);
  return out;
}
