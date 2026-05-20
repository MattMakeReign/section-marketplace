/**
 * POST /api/sections/[id]/lifecycle
 *
 * Curator-only endpoint that walks a section through its lifecycle states.
 * Updates the section's own `section.json` and commits the change via
 * Octokit. The Vercel rebuild that follows regenerates `index.json` from
 * every section.json on disk, so the move becomes visible ~30s later.
 *
 * The state machine lives in `@mr/section-library-ui/lifecycle-transitions` —
 * server-side validation rejects transitions the machine doesn't allow, so a
 * hand-rolled request can't write an arbitrary lifecycle value.
 *
 * No auth in V2 — team-only model. A future task adds GitHub OAuth on the
 * client side when the marketplace opens up beyond the team.
 *
 * Request body: { to: Lifecycle, note?: string }
 * Response:     { ok: true, section, commit } | { ok: false, error, code }
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getLifecycle,
  isValidTransition,
  LIFECYCLES,
  missingForApproval,
  APPROVAL_FIELD_LABELS,
  type Lifecycle,
  type ManifestEntry,
  type Manifest,
} from "@mr/section-library-ui";
import { commitFiles, type FileEntry } from "@/lib/github-commit";

export const dynamic = "force-dynamic";

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
    return NextResponse.json(
      { ok: false, error: "invalid JSON body", code: "invalid_args" },
      { status: 400 },
    );
  }

  if (!isLifecycle(body.to)) {
    return NextResponse.json(
      { ok: false, error: `"to" must be one of: ${LIFECYCLES.join(", ")}`, code: "invalid_args" },
      { status: 400 },
    );
  }
  const target: Lifecycle = body.to;

  // Read the bundled marketplace index to find the section's on-disk path.
  // The Vercel deployment ships the whole repo as read-only; cwd is the
  // marketplace root. Writes happen via Octokit further down.
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

  // Load the current section.json from disk (read-only), apply the update,
  // and commit the new contents via Octokit. The next Vercel build
  // regenerates index.json from this section.json — no separate index commit
  // is necessary.
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

  // Server-side Approve gate (promotion-system-v2). Defense in depth: the
  // curator UI disables the Approve button when fields are missing, but the
  // server enforces the same check so a hand-rolled request can't bypass it.
  // Checks against the freshly-loaded section.json — not the index entry,
  // which can lag a curator's just-saved description/tags by one build cycle.
  if (target === "Approved") {
    const missing = missingForApproval(sectionManifest);
    if (missing.length > 0) {
      const labels = missing.map((f) => APPROVAL_FIELD_LABELS[f]).join(", ");
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot approve — missing required fields: ${labels}`,
          code: "approval_blocked",
          missing,
        },
        { status: 409 },
      );
    }
  }

  const today = isoDate();
  sectionManifest.lifecycle = target;
  sectionManifest.updated = today;

  // Stamp `approvedAt` the first time a section reaches Approved. Preserve
  // existing attribution fields; only fill what's missing. Legacy data with
  // `promotedAt` is left alone — `getLifecycle()` already maps Promoted → Approved.
  if (target === "Approved") {
    const attribution = (sectionManifest.attribution ?? {}) as Record<string, unknown>;
    if (!attribution.approvedAt && !attribution.promotedAt) {
      sectionManifest.attribution = { ...attribution, approvedAt: today };
    }
  }

  const file: FileEntry = {
    path: sectionJsonRepoPath,
    encoding: "utf8",
    content: JSON.stringify(sectionManifest, null, 2) + "\n",
  };

  try {
    const result = await commitFiles({
      files: [file],
      message: `Lifecycle ${id}: ${current} → ${target}`,
      authorName: "MakeReign Marketplace",
      authorEmail: "marketplace@makereign.com",
    });
    return NextResponse.json({
      ok: true,
      section: { ...entry, lifecycle: target, updated: today },
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
