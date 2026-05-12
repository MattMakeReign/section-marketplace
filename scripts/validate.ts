/**
 * validate.ts
 *
 * Validates every section in `sections/` against the schema and the adaptation
 * contract. Run via `pnpm validate`. Exits non-zero on any failure so CI can
 * gate merges on this script.
 *
 * Today: schema validation + required-files check.
 * Coming with `task-phase2-design-system-adaptation`: lint for hard-coded
 * colours / pixel values / chrome-token usage inside section source files.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { lintSection } from "./lint-adaptation.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SECTIONS_DIR = join(ROOT, "sections");
const SCHEMA_PATH = join(ROOT, "schemas", "section.schema.json");

const REQUIRED_FILES = ["section.json", "index.tsx", "preview.png", "README.md"];

type Failure = { path: string; messages: string[] };

function loadValidator(): ValidateFunction {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function safeIsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function discoverSectionDirs(): string[] {
  const dirs: string[] = [];
  let categories: string[] = [];
  try {
    categories = readdirSync(SECTIONS_DIR);
  } catch {
    return dirs;
  }

  for (const category of categories) {
    const categoryDir = join(SECTIONS_DIR, category);
    if (!safeIsDir(categoryDir)) continue;

    for (const slug of readdirSync(categoryDir)) {
      const sectionDir = join(categoryDir, slug);
      if (!safeIsDir(sectionDir)) continue;
      // Only consider it a section if it has a section.json.
      if (existsSync(join(sectionDir, "section.json"))) {
        dirs.push(sectionDir);
      }
    }
  }

  return dirs;
}

function validateSection(dir: string, validate: ValidateFunction): string[] {
  const messages: string[] = [];

  for (const file of REQUIRED_FILES) {
    if (!existsSync(join(dir, file))) {
      messages.push(`missing required file: ${file}`);
    }
  }

  try {
    const manifest = JSON.parse(readFileSync(join(dir, "section.json"), "utf8"));
    if (!validate(manifest)) {
      for (const err of validate.errors ?? []) {
        messages.push(`section.json ${err.instancePath || "/"} ${err.message ?? ""}`);
      }
    }

    // Sanity: id should match folder slug.
    const folderSlug = dir.split("/").pop();
    if (typeof manifest.id === "string" && folderSlug && manifest.id !== folderSlug) {
      messages.push(
        `section.json id ('${manifest.id}') does not match folder slug ('${folderSlug}')`
      );
    }
  } catch (e) {
    messages.push(`section.json could not be parsed: ${(e as Error).message}`);
  }

  // Adaptation lint — chrome tokens, hard-coded colours, hard-coded type, etc.
  for (const finding of lintSection(dir)) {
    messages.push(
      `${finding.file}:${finding.line}:${finding.column} [${finding.rule}] ` +
        `${finding.message} (matched: '${finding.match}')`
    );
  }

  return messages;
}

function main(): void {
  const validate = loadValidator();
  const sectionDirs = discoverSectionDirs();

  if (sectionDirs.length === 0) {
    console.log("✓ no sections to validate yet");
    return;
  }

  const failures: Failure[] = [];
  for (const dir of sectionDirs) {
    const messages = validateSection(dir, validate);
    if (messages.length) {
      failures.push({ path: relative(ROOT, dir), messages });
    }
  }

  if (failures.length) {
    console.error(`✗ ${failures.length} section(s) failed validation:\n`);
    for (const f of failures) {
      console.error(`${f.path}:`);
      for (const m of f.messages) console.error(`  · ${m}`);
      console.error();
    }
    process.exit(1);
  }

  console.log(`✓ ${sectionDirs.length} section(s) passed validation`);
}

main();
