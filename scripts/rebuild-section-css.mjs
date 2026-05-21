#!/usr/bin/env node
/**
 * rebuild-section-css.mjs
 *
 * Per `task-marketplace-runtime-frozen-wrapper` (Fix #4, 2026-05-21): the
 * marketplace itself rebuilds every section's `compiled.css` at Vercel
 * deploy time, using each section's brand-context's design-system source
 * as the Tailwind input chain.
 *
 * What this unlocks
 * -----------------
 * Edit a token in `brand-contexts/<id>/design-system/tokens.css`, push to
 * GitHub, Vercel rebuilds → every section that references that brand-context
 * gets a refreshed `compiled.css` on the next deploy. No re-submit required.
 *
 * How it works
 * ------------
 * 1. Iterate `sections/<category>/<id>/`.
 * 2. Read each section's `section.json` for the `context` field (brand-context id).
 * 3. Resolve `brand-contexts/<contextId>/app/globals.css` — the project's
 *    Tailwind entry CSS, snapshotted into the marketplace at submit time.
 *    Skip the section if the brand-context isn't ship-CSS-ready (legacy
 *    metadata-only contexts).
 * 4. Compose a temp entry CSS that @imports globals.css PLUS narrows
 *    Tailwind's content scan to ONLY this section.
 * 5. Run `npx @tailwindcss/cli@latest` against the entry, write the result
 *    to the section's `compiled.css`.
 * 6. Walk the brand-context's CSS @import chain for any `@import url("https://…")`
 *    rules (e.g. Google Fonts) and prepend them to compiled.css — Tailwind v4
 *    / lightningcss strips those URLs on its own. See
 *    `cli-tool/src/lib/build-section-css.mjs` for the equivalent logic on the
 *    submit-time path.
 *
 * Idempotent: if a section's `context` doesn't resolve to a CSS-bearing
 * brand-context (only the legacy metadata `context.json` is present), the
 * section is left untouched. Re-submit the project once to populate its
 * brand-context with design-system source, then the next deploy will pick it up.
 *
 * Run locally:    node scripts/rebuild-section-css.mjs
 * Run on Vercel:  chained into `vercel.json`'s `buildCommand` ahead of
 *                 `next build` (see `npm run rebuild-css`).
 */

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SECTIONS_DIR = path.join(REPO_ROOT, "sections");
const BRAND_CONTEXTS_DIR = path.join(REPO_ROOT, "brand-contexts");

// Project layout convention: when running Tailwind at submit time, the CLI
// excludes these dirs to keep the content scan tight to the section's own
// .tsx files. Mirror it here so the marketplace build matches submit-time
// behaviour.
const EXCLUDE_DIRS = ["app", "components", "design-system", "lib", "sections"];

const startedAt = Date.now();
console.log("[rebuild-css] scanning sections…");

let totalSections = 0;
let rebuiltCount = 0;
let skippedNoContext = 0;
let skippedLegacyContext = 0;
let failed = 0;

const categories = await safeReaddir(SECTIONS_DIR);
for (const category of categories) {
  const categoryDir = path.join(SECTIONS_DIR, category);
  const stat = await fs.stat(categoryDir).catch(() => null);
  if (!stat?.isDirectory()) continue;

  const sectionIds = await safeReaddir(categoryDir);
  for (const sectionId of sectionIds) {
    const sectionDir = path.join(categoryDir, sectionId);
    if (!existsSync(path.join(sectionDir, "section.json"))) continue;
    if (!existsSync(path.join(sectionDir, "index.tsx"))) continue;
    totalSections += 1;

    let manifest;
    try {
      const raw = await fs.readFile(path.join(sectionDir, "section.json"), "utf8");
      manifest = JSON.parse(raw);
    } catch (err) {
      console.warn(`[rebuild-css] ${category}/${sectionId}: section.json unreadable — ${err.message}`);
      failed += 1;
      continue;
    }

    const contextId = typeof manifest.context === "string" ? manifest.context : null;
    if (!contextId) {
      skippedNoContext += 1;
      continue;
    }

    const brandContextDir = path.join(BRAND_CONTEXTS_DIR, contextId);
    const brandGlobals = path.join(brandContextDir, "app", "globals.css");
    if (!existsSync(brandGlobals)) {
      // Legacy metadata-only context — pre-Fix-#4 layout. Skip and emit a
      // hint so the user knows what to do.
      skippedLegacyContext += 1;
      console.log(
        `[rebuild-css] ${category}/${sectionId}: brand-context "${contextId}" is metadata-only ` +
          `(no app/globals.css). Re-submit a section from "${contextId}" to populate its design-system source, then redeploy.`,
      );
      continue;
    }

    try {
      await rebuildSection({ category, sectionId, sectionDir, contextId, brandContextDir, brandGlobals });
      rebuiltCount += 1;
    } catch (err) {
      failed += 1;
      console.error(`[rebuild-css] ${category}/${sectionId}: ${err.message}`);
      if (err.stderr) console.error(err.stderr.slice(0, 2000));
    }
  }
}

const durationMs = Date.now() - startedAt;
console.log(
  `[rebuild-css] done — scanned ${totalSections} section${totalSections === 1 ? "" : "s"} ` +
    `(rebuilt ${rebuiltCount}, skipped ${skippedNoContext + skippedLegacyContext}, failed ${failed}) in ${durationMs}ms`,
);

if (failed > 0) {
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// One-section rebuild
// ─────────────────────────────────────────────────────────────

/**
 * Rebuild a single section's compiled.css using its brand-context's
 * design-system source.
 */
async function rebuildSection({ category, sectionId, sectionDir, contextId, brandContextDir, brandGlobals }) {
  const buildDir = path.join(REPO_ROOT, ".mr-build", `${category}__${sectionId}`);
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  const tmpEntryPath = path.join(buildDir, "entry.css");
  const outputPath = path.join(buildDir, "compiled.css");

  // @source not <dir> to suppress Tailwind v4's automatic content detection
  // across the whole repo. Then @source <sectionDir>/**/*.{tsx,ts,jsx,js}
  // to scan ONLY this section's files. Matches the submit-time recipe.
  const sectionGlob = path.join(sectionDir, "**", "*.{tsx,ts,jsx,js}");
  const excludeGlobs = EXCLUDE_DIRS.map((dir) => `@source not "${path.join(REPO_ROOT, dir)}/**/*";`).join("\n");
  const includeGlobs = `@source "${sectionGlob}";`;

  const entry = `@import "${brandGlobals}";\n\n/* Restrict Tailwind's content scan to just this section. */\n${excludeGlobs}\n${includeGlobs}\n`;
  await fs.writeFile(tmpEntryPath, entry, "utf8");

  const args = ["--yes", "@tailwindcss/cli@latest", "-i", tmpEntryPath, "-o", outputPath, "--minify"];
  await runNpx(args, brandContextDir, `${category}/${sectionId}`);

  let css = await fs.readFile(outputPath, "utf8");

  // Prepend any `@import url("https://…")` rules from the brand-context CSS
  // chain — Tailwind v4 strips them. Identical recipe to submit-time path.
  const remoteImports = await collectRemoteCssImports(brandGlobals);
  if (remoteImports.length > 0) {
    css = remoteImports.join("\n") + "\n" + css;
  }

  const compiledPath = path.join(sectionDir, "compiled.css");
  await fs.writeFile(compiledPath, css, "utf8");

  await fs.rm(buildDir, { recursive: true, force: true });

  console.log(
    `[rebuild-css] ${category}/${sectionId} ← ${contextId} (${Buffer.byteLength(css, "utf8")} bytes)`,
  );
}

function runNpx(args, cwd, label) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("close", (code) => {
      if (code === 0) return resolve();
      const err = new Error(`Tailwind CLI exited ${code} for ${label}`);
      err.stderr = stderr;
      reject(err);
    });
    child.on("error", (err) => reject(err));
  });
}

async function safeReaddir(dir) {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

/**
 * Walk a CSS file's @import chain and return every external
 * `@import url("https://…")` rule encountered, in order. External URLs are
 * returned as-is — never fetched.
 */
async function collectRemoteCssImports(entryAbsPath) {
  const visited = new Set();
  const remote = [];
  const remoteSeen = new Set();
  // Match @import variants:
  //   @import "path";
  //   @import 'path';
  //   @import url("path");
  //   @import url('path');
  //   @import url(path);
  // Three alternations capture the URL inside each delimiter style. Crucially
  // we do NOT exclude semicolons from quoted URLs — Google Fonts query strings
  // contain `;` (e.g. "wght@400;500;700"). Bare urls stop at whitespace, `)`,
  // or `;` since they have no other terminator.
  const importRule = /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s;)]+))\s*\)?\s*;?/g;

  async function walk(file) {
    const absolute = path.resolve(file);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    let contents;
    try {
      contents = await fs.readFile(absolute, "utf8");
    } catch {
      return;
    }
    const dir = path.dirname(absolute);
    importRule.lastIndex = 0;
    let m;
    while ((m = importRule.exec(contents)) !== null) {
      const ref = m[1] ?? m[2] ?? m[3];
      if (!ref) continue;
      if (/^https?:\/\//i.test(ref)) {
        const line = `@import url("${ref}");`;
        if (!remoteSeen.has(line)) {
          remoteSeen.add(line);
          remote.push(line);
        }
        continue;
      }
      if (ref === "tailwindcss" || ref.startsWith("tw-")) continue;
      const resolved = path.resolve(dir, ref);
      await walk(resolved);
    }
  }

  await walk(entryAbsPath);
  return remote;
}
