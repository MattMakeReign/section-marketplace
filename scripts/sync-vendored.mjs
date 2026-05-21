/**
 * sync-vendored.mjs
 *
 * Refreshes the marketplace's vendored copies of shared workspace packages
 * (@mr/canonical-stack, @mr/tools-ui) by copying from their source-of-truth
 * locations under repos/. Run this whenever a vendored package changes upstream.
 *
 * Why we vendor instead of using pnpm workspace links: the marketplace's
 * Vercel build runs `npm install --no-package-lock` in a standalone context
 * (no pnpm workspace), so `@mr/*: workspace:*` symlinks won't resolve.
 * Webpack aliases in next.config.mjs point at the vendored copies under lib/.
 *
 * Usage:
 *   pnpm sync:vendored                   # syncs all vendored packages
 *   pnpm sync:vendored canonical-stack   # syncs just one
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MARKETPLACE_ROOT = path.dirname(HERE);
const REPOS_ROOT = path.dirname(MARKETPLACE_ROOT);

const VENDORED = {
  "canonical-stack": {
    source: path.join(REPOS_ROOT, "canonical-stack", "src"),
    dest: path.join(MARKETPLACE_ROOT, "lib", "canonical-stack"),
  },
  // Future entries: tools-ui (currently synced manually per chunk-by-chunk plan).
};

async function rmrf(p) {
  await fs.rm(p, { recursive: true, force: true });
}

async function copyTree(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(src, e.name);
    const to = path.join(dst, e.name);
    if (e.isDirectory()) await copyTree(from, to);
    else await fs.copyFile(from, to);
  }
}

async function syncOne(name) {
  const cfg = VENDORED[name];
  if (!cfg) {
    console.error(`Unknown vendored package: ${name}. Known: ${Object.keys(VENDORED).join(", ")}`);
    process.exit(1);
  }
  try {
    await fs.access(cfg.source);
  } catch {
    console.error(`Source not found: ${cfg.source}`);
    process.exit(1);
  }
  console.log(`⇲  ${name}: ${path.relative(REPOS_ROOT, cfg.source)} → ${path.relative(MARKETPLACE_ROOT, cfg.dest)}`);
  await rmrf(cfg.dest);
  await copyTree(cfg.source, cfg.dest);
  console.log(`✓  ${name} synced`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : Object.keys(VENDORED);
  for (const name of targets) {
    await syncOne(name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
