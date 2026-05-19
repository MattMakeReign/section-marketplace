/**
 * build-manifest.ts
 *
 * 1. Walks `sections/<category>/<slug>/section.json`, validates each against the
 *    section schema, and writes the aggregated section manifest to `index.json`.
 * 2. Walks `brand-contexts/<id>/context.json`, rolls up `sectionsUsing` counts,
 *    and writes `brand-contexts/index.json`.
 *
 * Run via `pnpm build`.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SECTIONS_DIR = join(ROOT, "sections");
const SCHEMA_PATH = join(ROOT, "schemas", "section.schema.json");
const OUT_PATH = join(ROOT, "index.json");
const CONTEXTS_DIR = join(ROOT, "brand-contexts");
const CONTEXTS_OUT_PATH = join(CONTEXTS_DIR, "index.json");

type SectionManifest = {
  id: string;
  name: string;
  category: string;
  version: string;
  track?: "stable" | "experimental" | "legacy";
  description: string;
  motionDensity: string[];
  responsive: { profile: string; breakpoints?: string[]; notes?: string };
  previews: { static: string; live?: boolean };
  tags?: string[];
  created: string;
  updated: string;
  submittedBy: string;
  context?: string | null;
  [key: string]: unknown;
};

type IndexEntry = SectionManifest & {
  path: string;
};

type BrandContextMeta = {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  originatingProject?: string | null;
  created?: string;
  updated?: string;
  status?: "active" | "deprecated";
  tokensHash?: string | null;
  sectionsUsing?: string[];
  [key: string]: unknown;
};

function loadValidator(): ValidateFunction<SectionManifest> {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile<SectionManifest>(schema);
}

function discoverSections(): { dir: string; manifest: unknown }[] {
  const found: { dir: string; manifest: unknown }[] = [];
  let categories: string[] = [];
  try {
    categories = readdirSync(SECTIONS_DIR);
  } catch {
    return found;
  }

  for (const category of categories) {
    const categoryDir = join(SECTIONS_DIR, category);
    if (!safeIsDir(categoryDir)) continue;

    for (const slug of readdirSync(categoryDir)) {
      const sectionDir = join(categoryDir, slug);
      if (!safeIsDir(sectionDir)) continue;

      const manifestPath = join(sectionDir, "section.json");
      try {
        const raw = readFileSync(manifestPath, "utf8");
        found.push({ dir: sectionDir, manifest: JSON.parse(raw) });
      } catch {
        // Skip folders without a section.json.
      }
    }
  }

  return found;
}

function discoverBrandContexts(): BrandContextMeta[] {
  if (!existsSync(CONTEXTS_DIR)) return [];
  const out: BrandContextMeta[] = [];
  for (const entry of readdirSync(CONTEXTS_DIR)) {
    const dir = join(CONTEXTS_DIR, entry);
    if (!safeIsDir(dir)) continue;
    const metaPath = join(dir, "context.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as BrandContextMeta;
      out.push(meta);
    } catch {
      console.warn(`✗ brand-contexts/${entry}/context.json failed to parse — skipping`);
    }
  }
  return out;
}

function safeIsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Extract a context's id from a `section.json.context` reference.
 * "acme-2025" → "acme-2025"
 * "acme-2025@1.0.0" → "acme-2025"
 * null / "_neutral" / undefined → null
 */
function contextIdFromRef(ref: string | null | undefined): string | null {
  if (!ref || ref === "_neutral") return null;
  const at = ref.indexOf("@");
  return at === -1 ? ref : ref.slice(0, at);
}

function buildSectionsIndex(): IndexEntry[] {
  const validate = loadValidator();
  const discovered = discoverSections();

  const entries: IndexEntry[] = [];
  const errors: string[] = [];

  for (const { dir, manifest } of discovered) {
    const ok = validate(manifest);
    const relPath = relative(ROOT, dir);
    if (!ok) {
      errors.push(
        `${relPath}/section.json:\n` +
          (validate.errors ?? [])
            .map((e) => `  · ${e.instancePath || "/"} ${e.message ?? ""}`)
            .join("\n")
      );
      continue;
    }
    entries.push({ ...(manifest as SectionManifest), path: relPath });
  }

  if (errors.length) {
    console.error(`✗ ${errors.length} section(s) failed schema validation:\n`);
    console.error(errors.join("\n\n"));
    process.exit(1);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function buildContextsIndex(sections: IndexEntry[]): BrandContextMeta[] {
  const contexts = discoverBrandContexts();

  // Roll up which sections reference each context.
  const usage = new Map<string, string[]>();
  for (const section of sections) {
    const cid = contextIdFromRef(section.context);
    if (!cid) continue;
    if (!usage.has(cid)) usage.set(cid, []);
    usage.get(cid)!.push(section.id);
  }

  const enriched = contexts.map((c) => ({
    ...c,
    sectionsUsing: (usage.get(c.id) ?? []).sort(),
  }));

  // Sort: _neutral first, then alphabetical.
  enriched.sort((a, b) => {
    if (a.id === "_neutral") return -1;
    if (b.id === "_neutral") return 1;
    return a.id.localeCompare(b.id);
  });

  return enriched;
}

function main(): void {
  const sections = buildSectionsIndex();

  // Sections index.
  const sectionsOut = {
    generated: new Date().toISOString(),
    count: sections.length,
    sections,
  };
  writeFileSync(OUT_PATH, JSON.stringify(sectionsOut, null, 2) + "\n", "utf8");
  console.log(`✓ index.json updated · ${sections.length} section(s)`);

  // Brand contexts index. Only write if the directory exists — gracefully
  // skip for legacy checkouts that haven't introduced contexts yet.
  if (existsSync(CONTEXTS_DIR)) {
    const contexts = buildContextsIndex(sections);
    const contextsOut = {
      generated: new Date().toISOString(),
      count: contexts.length,
      contexts,
    };
    writeFileSync(CONTEXTS_OUT_PATH, JSON.stringify(contextsOut, null, 2) + "\n", "utf8");
    console.log(`✓ brand-contexts/index.json updated · ${contexts.length} context(s)`);
  }
}

main();
