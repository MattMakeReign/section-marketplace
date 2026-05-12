/**
 * build-manifest.ts
 *
 * Walks `sections/<category>/<slug>/section.json`, validates each against the
 * schema, and writes the aggregated manifest to `index.json` at the repo root.
 *
 * Run via `pnpm build`.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SECTIONS_DIR = join(ROOT, "sections");
const SCHEMA_PATH = join(ROOT, "schemas", "section.schema.json");
const OUT_PATH = join(ROOT, "index.json");

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
  [key: string]: unknown;
};

type IndexEntry = SectionManifest & {
  path: string; // path relative to repo root, e.g. "sections/hero/hero-split-bold"
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
        // Skip folders without a section.json (e.g. bare category folders during scaffolding).
      }
    }
  }

  return found;
}

function safeIsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function main(): void {
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

  const out = {
    generated: new Date().toISOString(),
    count: entries.length,
    sections: entries,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`✓ index.json updated · ${entries.length} section(s)`);
}

main();
