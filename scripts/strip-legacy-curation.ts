/**
 * strip-legacy-curation.ts — one-shot migration for promotion-system-v2.
 *
 * Walks every `sections/<category>/<slug>/section.json` and:
 *
 *   1. Deletes the legacy `curation` object (8 fields + composition).
 *   2. Deletes the legacy `responsive` object.
 *   3. If `previews.static` is a relative filename (e.g. "preview.png"),
 *      uploads the on-disk file to Supabase Storage and replaces the field
 *      with the public URL. If the file is a wireframe (`preview.svg`),
 *      it's NOT uploaded — the field is just dropped so the gallery falls
 *      back to the fallback tile until a real screenshot is captured.
 *   4. Rewrites the section's `README.md` by stripping these four H2
 *      sections (case-insensitive): "When to use", "When NOT to use",
 *      "Adaptation notes", "Failure modes". Everything else is preserved.
 *   5. Bumps `updated` to today's date.
 *
 * Default mode: dry-run. Prints the plan and exits without writing. Pass
 * `--write` to actually mutate files. Pass `--no-upload` to skip Supabase
 * uploads (useful if the service-role key isn't configured yet — the script
 * will still strip the legacy fields but leave previews.static untouched).
 *
 * Run from repos/section-marketplace/ with:
 *
 *   pnpm tsx scripts/strip-legacy-curation.ts             # dry-run
 *   pnpm tsx scripts/strip-legacy-curation.ts --write     # apply
 *
 * Idempotent: re-running after a write is a no-op (no curation to strip,
 * URLs unchanged because Supabase upsert is stable).
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Load .env.local at script-start (Next.js loads it automatically in the dev
// server, but a standalone tsx invocation doesn't). Minimal parser — anything
// after "=" is the value; quotes are stripped.
{
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const raw of readFileSync(envPath, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

import {
  uploadPreviewAsset,
  isSupabaseStorageConfigured,
  publicUrlFor,
  SupabaseStorageError,
} from "../lib/supabase-storage";

const LEGACY_README_HEADINGS = new Set([
  "when to use",
  "when not to use",
  "adaptation notes",
  "failure modes",
]);

const STRIP_FIELDS = ["curation", "prose", "responsive"] as const;

type SectionFile = {
  category: string;
  slug: string;
  absDir: string;
  sectionJsonPath: string;
  readmePath: string;
};

function isoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function findSections(root: string): Promise<SectionFile[]> {
  const sectionsRoot = path.join(root, "sections");
  const categories = await readdir(sectionsRoot, { withFileTypes: true });
  const out: SectionFile[] = [];
  for (const c of categories) {
    if (!c.isDirectory()) continue;
    const catDir = path.join(sectionsRoot, c.name);
    const slugs = await readdir(catDir, { withFileTypes: true });
    for (const s of slugs) {
      if (!s.isDirectory()) continue;
      const absDir = path.join(catDir, s.name);
      const sectionJsonPath = path.join(absDir, "section.json");
      try {
        await stat(sectionJsonPath);
      } catch {
        continue;
      }
      out.push({
        category: c.name,
        slug: s.name,
        absDir,
        sectionJsonPath,
        readmePath: path.join(absDir, "README.md"),
      });
    }
  }
  return out;
}

/**
 * Replace any H2 block whose heading matches one of the legacy 4 with
 * nothing (the heading + its body are removed cleanly, including the blank
 * line that separated them from the next heading). Everything else stays.
 */
function stripLegacyReadmeSections(source: string): { next: string; removed: string[] } {
  const lines = source.split("\n");
  const removed: string[] = [];

  type Block = { heading: string; start: number; end: number; isLegacy: boolean };
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    blocks.push({
      heading: m[1].trim(),
      start: i,
      end: lines.length,
      isLegacy: LEGACY_README_HEADINGS.has(m[1].trim().toLowerCase()),
    });
  }
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].end = blocks[i + 1].start;
  }

  // Remove the legacy blocks back-to-front so earlier indices stay valid.
  const next = [...lines];
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (!b.isLegacy) continue;
    removed.push(b.heading);
    // Drop the lines [start, end). Also trim a trailing blank if present so
    // we don't accumulate double-blanks.
    next.splice(b.start, b.end - b.start);
    if (next[b.start] === "" && (next[b.start - 1] === "" || b.start === 0)) {
      next.splice(b.start, 1);
    }
  }

  // Collapse 3+ consecutive blank lines down to 2.
  const collapsed: string[] = [];
  let blanks = 0;
  for (const ln of next) {
    if (ln.trim() === "") {
      blanks++;
      if (blanks <= 1) collapsed.push(ln);
    } else {
      blanks = 0;
      collapsed.push(ln);
    }
  }

  return { next: collapsed.join("\n"), removed: removed.reverse() };
}

type Action =
  | { kind: "skip"; reason: string }
  | { kind: "strip-only"; strippedFields: string[]; readmeRemoved: string[] }
  | { kind: "strip+upload"; strippedFields: string[]; readmeRemoved: string[]; previewUploadFrom: string; previewUrl: string }
  | { kind: "strip+url-only"; strippedFields: string[]; readmeRemoved: string[]; previewUrl: string };

type PlanRow = { file: SectionFile; action: Action; manifestBefore: unknown; manifestAfter: unknown; readmeChanged: boolean };

async function planSection(
  file: SectionFile,
  opts: { dryRun: boolean; supabaseEnabled: boolean; uploadEnabled: boolean },
): Promise<PlanRow> {
  const manifestRaw = await readFile(file.sectionJsonPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const before = JSON.parse(JSON.stringify(manifest));

  let strippedFields: string[] = [];
  for (const f of STRIP_FIELDS) {
    if (f in manifest) {
      delete manifest[f];
      strippedFields.push(f);
    }
  }

  // previews.static URL migration.
  const previews = (manifest.previews ?? {}) as Record<string, unknown>;
  let previewUrl: string | null = null;
  let uploadFrom: string | null = null;
  if (typeof previews.static === "string" && previews.static.length > 0) {
    const current = previews.static as string;
    if (/^https?:\/\//i.test(current)) {
      // Already a URL — leave alone.
    } else if (current.toLowerCase().endsWith(".svg")) {
      // Wireframe placeholder — don't upload; drop the field so the App
      // shows its built-in fallback tile.
      delete previews.static;
      strippedFields.push("previews.static (wireframe drop)");
    } else {
      // Relative PNG/JPEG/WebP — upload to Supabase if enabled, else leave alone.
      const fileOnDisk = path.join(file.absDir, current);
      if (opts.uploadEnabled && opts.supabaseEnabled) {
        uploadFrom = fileOnDisk;
        // Stable object path matches the protocol.mjs convention so re-submits overwrite.
        const ext = path.extname(current).toLowerCase().slice(1) || "png";
        const objectPath = `${file.slug}/preview.${ext}`;
        previewUrl = publicUrlFor(objectPath);
      }
    }
  }
  if (previewUrl) previews.static = previewUrl;
  manifest.previews = previews;

  // README migration.
  let readmeRemoved: string[] = [];
  let readmeChanged = false;
  try {
    const readme = await readFile(file.readmePath, "utf8");
    const { next, removed } = stripLegacyReadmeSections(readme);
    readmeRemoved = removed;
    readmeChanged = next !== readme;
    if (!opts.dryRun && readmeChanged) {
      await writeFile(file.readmePath, next, "utf8");
    }
  } catch {
    // No README — nothing to do.
  }

  // Bump updated if anything actually changed.
  const nothingChanged =
    strippedFields.length === 0 &&
    !readmeChanged &&
    !uploadFrom;
  if (!nothingChanged) {
    manifest.updated = isoDate();
  }

  // Build the action descriptor for the dry-run print.
  let action: Action;
  if (nothingChanged) {
    action = { kind: "skip", reason: "already clean" };
  } else if (uploadFrom && previewUrl) {
    action = {
      kind: "strip+upload",
      strippedFields,
      readmeRemoved,
      previewUploadFrom: uploadFrom,
      previewUrl,
    };
  } else if (previewUrl) {
    action = { kind: "strip+url-only", strippedFields, readmeRemoved, previewUrl };
  } else {
    action = { kind: "strip-only", strippedFields, readmeRemoved };
  }

  // Write the manifest if not dry-run.
  if (!opts.dryRun && !nothingChanged) {
    // Upload first; only write the manifest if the upload succeeds.
    if (uploadFrom) {
      const ext = path.extname(uploadFrom).toLowerCase();
      const mime =
        ext === ".png" ? "image/png" :
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        ext === ".webp" ? "image/webp" :
        "application/octet-stream";
      const body = await readFile(uploadFrom);
      const objectPath = `${file.slug}/preview${ext}`;
      try {
        const uploaded = await uploadPreviewAsset({
          objectPath,
          body,
          contentType: mime,
        });
        previews.static = uploaded.url;
        manifest.previews = previews;
      } catch (err) {
        if (err instanceof SupabaseStorageError) {
          throw new Error(`upload failed for ${file.slug}: ${err.message}`);
        }
        throw err;
      }
    }
    await writeFile(
      file.sectionJsonPath,
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );
  }

  return {
    file,
    action,
    manifestBefore: before,
    manifestAfter: manifest,
    readmeChanged,
  };
}

function formatAction(row: PlanRow): string {
  const id = `${row.file.category}/${row.file.slug}`;
  switch (row.action.kind) {
    case "skip":
      return `  · ${id.padEnd(48)} — ${row.action.reason}`;
    case "strip-only":
      return `  ✎ ${id.padEnd(48)} — strip [${row.action.strippedFields.join(", ")}]` +
        (row.action.readmeRemoved.length ? `; README -${row.action.readmeRemoved.length} sections` : "");
    case "strip+upload":
      return `  ↑ ${id.padEnd(48)} — strip [${row.action.strippedFields.join(", ")}] + upload preview` +
        (row.action.readmeRemoved.length ? `; README -${row.action.readmeRemoved.length} sections` : "");
    case "strip+url-only":
      return `  → ${id.padEnd(48)} — strip [${row.action.strippedFields.join(", ")}] (preview URL precomputed)`;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = !args.has("--write");
  const uploadEnabled = !args.has("--no-upload");
  const supabaseEnabled = isSupabaseStorageConfigured();

  const root = process.cwd();
  const sections = await findSections(root);

  console.log(`\n${dryRun ? "🔎 DRY-RUN" : "✍️  WRITE"} — strip-legacy-curation`);
  console.log(`   root: ${root}`);
  console.log(`   sections: ${sections.length}`);
  console.log(`   supabase: ${supabaseEnabled ? "configured" : "NOT configured"}`);
  console.log(`   uploads: ${uploadEnabled ? "enabled" : "disabled (--no-upload)"}`);
  console.log("");

  if (!supabaseEnabled && uploadEnabled && !dryRun) {
    console.error("✗ Supabase Storage is not configured.");
    console.error("  Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in repos/section-marketplace/.env.local,");
    console.error("  OR re-run with --no-upload to skip preview migration.");
    process.exit(2);
  }

  let touched = 0;
  let skipped = 0;
  let uploaded = 0;

  for (const file of sections) {
    try {
      const row = await planSection(file, { dryRun, supabaseEnabled, uploadEnabled });
      console.log(formatAction(row));
      if (row.action.kind === "skip") skipped++;
      else touched++;
      if (row.action.kind === "strip+upload") uploaded++;
    } catch (err) {
      console.error(`  ✗ ${file.category}/${file.slug} — ${(err as Error).message ?? err}`);
    }
  }

  console.log("");
  console.log(`   touched: ${touched}`);
  console.log(`   skipped: ${skipped}`);
  console.log(`   uploads: ${uploaded}`);
  if (dryRun) {
    console.log("\n   No files written. Re-run with --write to apply.");
  } else {
    console.log("\n   Done. Run `pnpm build` to regenerate index.json, then commit.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
