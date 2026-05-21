/**
 * Brand context resolver.
 *
 * A "brand context" is a versioned bundle of design-system inputs (tokens,
 * fonts, brand assets) that a section was authored against. Sections REFERENCE
 * a context by id in `section.json.context`; the marketplace render route
 * loads it scoped to the section preview.
 *
 * Two reference shapes (Option C — default float, opt-in pin):
 *   "acme-2025"          → float to latest version of `acme-2025`
 *   "acme-2025@1.0.0"    → pin to that specific version
 *
 * `null`, undefined, or `"_neutral"` → renders against the marketplace's
 * neutral default (the global `:root` in `design-system/tokens.css`).
 *
 * Architecture: `decision-section-brand-contexts.md` in the workspace tracker.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

// Resolve relative to process.cwd() so the resolver finds brand-contexts/
// in BOTH local dev AND Vercel serverless functions. Previously this used
// `fileURLToPath(import.meta.url)`, which works locally (file lives at
// .../section-marketplace/lib/brand-contexts.ts so dirname(dirname(HERE))
// = project root) but breaks on Vercel where the bundled file lives at
// .next/server/chunks/* and the dirname climb lands somewhere meaningless.
// Next.js sets process.cwd() to the project root in both environments.
const CONTEXTS_DIR = join(process.cwd(), "brand-contexts");

export type BrandContextStatus = "active" | "deprecated";

export type BrandContextMeta = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  originatingProject: string | null;
  created: string;
  updated: string;
  status: BrandContextStatus;
  tokensHash: string | null;
  sectionsUsing: string[];
};

export type ResolvedBrandContext = {
  id: string;
  requestedVersion: string | null;    // present iff caller pinned (e.g. "acme-2025@1.0.0")
  resolvedVersion: string;            // actual version on disk
  meta: BrandContextMeta;
  tokensCss: string | null;           // null for _neutral or any context without tokens.css
  fontsCss: string | null;            // null when no fonts.css present
  componentsCss: string | null;       // null when no components.css present — already
                                      // scoped to [data-section-context="<id>"] via native CSS nesting
};

/**
 * Parse a `section.json.context` reference into `{ id, version }`.
 * Returns `null` for null/undefined/empty/_neutral — caller should render
 * against the marketplace's neutral default.
 */
export function parseContextReference(
  ref: string | null | undefined,
): { id: string; version: string | null } | null {
  if (!ref) return null;
  if (ref === "_neutral") return null;
  const at = ref.indexOf("@");
  if (at === -1) return { id: ref, version: null };
  return { id: ref.slice(0, at), version: ref.slice(at + 1) };
}

/**
 * Read the metadata for a brand context. Returns null if the context
 * directory or `context.json` is missing.
 */
export function readBrandContextMeta(id: string): BrandContextMeta | null {
  const metaPath = join(CONTEXTS_DIR, id, "context.json");
  if (!existsSync(metaPath)) return null;
  try {
    const raw = readFileSync(metaPath, "utf8");
    return JSON.parse(raw) as BrandContextMeta;
  } catch {
    return null;
  }
}

/**
 * Resolve a `section.json.context` reference into the actual context bundle
 * that should render. Returns null for the neutral default (no scoped CSS
 * needed — the marketplace's global `:root` is the baseline).
 *
 * Currently the marketplace stores one version per context. The version field
 * in `context.json` is the truth. If a pin is requested and the on-disk version
 * differs, the resolver still returns the on-disk version + records the mismatch
 * via `requestedVersion` — callers can warn or fall back. (Multi-version on-disk
 * storage is a follow-up; the resolver shape is forward-compatible.)
 */
export function resolveBrandContext(
  ref: string | null | undefined,
): ResolvedBrandContext | null {
  const parsed = parseContextReference(ref);
  if (!parsed) return null;
  const meta = readBrandContextMeta(parsed.id);
  if (!meta) return null;

  const tokensPath = join(CONTEXTS_DIR, parsed.id, "tokens.css");
  const fontsPath = join(CONTEXTS_DIR, parsed.id, "fonts.css");
  const componentsPath = join(CONTEXTS_DIR, parsed.id, "components.css");

  return {
    id: parsed.id,
    requestedVersion: parsed.version,
    resolvedVersion: meta.version,
    meta,
    tokensCss: existsSync(tokensPath) ? readFileSync(tokensPath, "utf8") : null,
    fontsCss: existsSync(fontsPath) ? readFileSync(fontsPath, "utf8") : null,
    componentsCss: existsSync(componentsPath) ? readFileSync(componentsPath, "utf8") : null,
  };
}

/**
 * List all brand contexts that exist on disk. Used by:
 *   - the build script to write `brand-contexts/index.json`
 *   - the Library App to render the "Browse by brand" filter
 */
export function listBrandContexts(): BrandContextMeta[] {
  if (!existsSync(CONTEXTS_DIR)) return [];
  const out: BrandContextMeta[] = [];
  for (const entry of readdirSync(CONTEXTS_DIR)) {
    const dir = join(CONTEXTS_DIR, entry);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const meta = readBrandContextMeta(entry);
    if (meta) out.push(meta);
  }
  // Sort: _neutral first, then alphabetical by id.
  out.sort((a, b) => {
    if (a.id === "_neutral") return -1;
    if (b.id === "_neutral") return 1;
    return a.id.localeCompare(b.id);
  });
  return out;
}

/**
 * Format a user-facing label for a context reference. Falls back to the raw
 * id when no metadata exists on disk.
 */
export function formatContextLabel(
  ref: string | null | undefined,
  meta: BrandContextMeta | null,
): string {
  const parsed = parseContextReference(ref);
  if (!parsed) return "Neutral";
  if (!meta) return parsed.id;
  return parsed.version ? `${meta.name} @ ${parsed.version}` : meta.name;
}
