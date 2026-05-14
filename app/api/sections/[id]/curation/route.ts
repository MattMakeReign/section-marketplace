/**
 * PUT /api/sections/[id]/curation
 *
 * Save the curator's enrichment pass for a section. Two writes:
 *   1. `section.json` — merge structured `curation` fields, bump `updated`.
 *   2. `README.md`   — round-trip named H2 sections (When to use / When NOT
 *                      to use / Adaptation notes / Failure modes). Other
 *                      sections in the README are left untouched.
 *
 * After the writes, patches the marketplace `index.json` in place so the
 * gallery + review queue reflect the new state on next render without a full
 * `pnpm build`.
 *
 * No auth in v1 — local-dev curation only.
 *
 * Request body:
 *   {
 *     curation?: Partial<Curation>,
 *     prose?: Partial<ProseSections>
 *   }
 *
 * Response:
 *   { ok: true, section: ManifestEntry } | { ok: false, error, code }
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  README_PROSE_SECTIONS,
  isCanonicalCategory,
  type Curation,
  type ManifestEntry,
  type Manifest,
  type ProseSections,
  type ReadmeProseKey,
} from "@mr/section-library-ui";

type IndexJson = Manifest & { sections?: ManifestEntry[] };

function isoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─────────────────────────── Curation merge ─────────────────────────── */

/**
 * Shallow merge for top-level scalar/array fields; nested `composition`
 * object is merged a level deeper so the curator can update one pair list
 * without nuking the others.
 */
function mergeCuration(prev: Curation | undefined, next: Partial<Curation>): Curation {
  const merged: Curation = { ...(prev ?? {}) };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) continue;
    if (key === "composition" && typeof value === "object" && value !== null) {
      merged.composition = { ...(merged.composition ?? {}), ...(value as Curation["composition"]) };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = value;
    }
  }
  return merged;
}

/* ─────────────────────────── README round-trip ─────────────────────────── */

/**
 * Replace named H2 sections in a markdown document. Each entry in `updates`
 * is keyed by H2 heading text (case-insensitive); the body is the markdown
 * to put under that heading. Headings that don't exist yet are appended at
 * the end. Headings not in `updates` are untouched.
 */
function applyProseUpdates(
  readmeSource: string,
  updates: Array<{ heading: string; body: string }>,
): string {
  const lines = readmeSource.split("\n");

  // Find every H2 heading + its line range. Range is [start, endExclusive].
  type Section = { heading: string; headingLine: number; bodyEnd: number };
  const sections: Section[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    sections.push({ heading: m[1].trim(), headingLine: i, bodyEnd: lines.length });
  }
  // Cap each section's bodyEnd at the next section's headingLine.
  for (let i = 0; i < sections.length; i++) {
    if (i + 1 < sections.length) sections[i].bodyEnd = sections[i + 1].headingLine;
  }

  // For each update, find the existing section by case-insensitive heading
  // match and replace its body. Track which updates didn't land — they get
  // appended at the end as fresh sections.
  const newLines = [...lines];
  const appended: Array<{ heading: string; body: string }> = [];

  // Apply replacements in reverse order so earlier indices stay stable.
  const replacements: Array<{ section: Section; body: string }> = [];
  for (const update of updates) {
    const existing = sections.find(
      (s) => s.heading.toLowerCase() === update.heading.toLowerCase(),
    );
    if (existing) {
      replacements.push({ section: existing, body: update.body });
    } else {
      appended.push(update);
    }
  }
  replacements.sort((a, b) => b.section.headingLine - a.section.headingLine);
  for (const { section, body } of replacements) {
    const bodyLines = body.split("\n");
    // Replace lines (headingLine + 1) .. bodyEnd with a blank line + bodyLines + blank.
    const replacement = ["", ...bodyLines, ""];
    newLines.splice(
      section.headingLine + 1,
      section.bodyEnd - section.headingLine - 1,
      ...replacement,
    );
  }

  // Append missing sections.
  if (appended.length > 0) {
    if (newLines[newLines.length - 1] !== "") newLines.push("");
    for (const a of appended) {
      newLines.push(`## ${a.heading}`, "", ...a.body.split("\n"), "");
    }
  }

  return newLines.join("\n");
}

/* ─────────────────────────── Route ─────────────────────────── */

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  let body: { curation?: Partial<Curation>; prose?: ProseSections; category?: string };
  try {
    body = (await req.json()) as {
      curation?: Partial<Curation>;
      prose?: ProseSections;
      category?: string;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body", code: "invalid_args" }, { status: 400 });
  }

  // Validate canonical category if the curator sent one.
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

  // 1. section.json — merge curation fields, bump updated.
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
  if (body.curation) {
    sectionManifest.curation = mergeCuration(sectionManifest.curation, body.curation);
  }
  if (body.category) {
    sectionManifest.category = body.category;
  }
  sectionManifest.updated = today;

  try {
    await writeFile(sectionJsonPath, JSON.stringify(sectionManifest, null, 2) + "\n", "utf8");
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `could not write section.json: ${(e as Error).message}`, code: "write_failed" },
      { status: 500 },
    );
  }

  // 2. README.md — round-trip named prose sections.
  if (body.prose) {
    const readmePath = path.join(root, entry.path, "README.md");
    let readmeSource = "";
    try {
      readmeSource = await readFile(readmePath, "utf8");
    } catch {
      // README missing — scaffold a minimal frame so we have somewhere to land.
      readmeSource = `# ${sectionManifest.name ?? id}\n\n${sectionManifest.description ?? ""}\n`;
    }
    const updates = README_PROSE_SECTIONS
      .filter((s) => typeof body.prose?.[s.key as ReadmeProseKey] === "string")
      .map((s) => ({
        heading: s.heading,
        body: (body.prose![s.key as ReadmeProseKey] ?? "").trim(),
      }));
    if (updates.length > 0) {
      const updated = applyProseUpdates(readmeSource, updates);
      try {
        await writeFile(readmePath, updated, "utf8");
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: `could not write README.md: ${(e as Error).message}`, code: "write_failed" },
          { status: 500 },
        );
      }
    }
  }

  // 3. Patch index.json in place.
  entry.curation = sectionManifest.curation;
  if (body.category) entry.category = body.category;
  entry.updated = today;
  index.generated = new Date().toISOString();
  try {
    await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `could not patch index.json: ${(e as Error).message}`, code: "write_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, section: entry });
}
