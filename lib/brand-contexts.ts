/**
 * Brand context resolver — METADATA ONLY.
 *
 * A "brand context" is the project a section was authored in (e.g. "mr-halden-
 * miller"). Per `decision-marketplace-frozen-section-bundles` (2026-05-21),
 * brand contexts NO LONGER ship CSS bundles. Each section travels with its
 * own pre-compiled.css produced at submit time inside the source project's
 * Tailwind build. The marketplace renders sections pixel-identical to their
 * origin; brand contexts exist for METADATA — populating the Projects filter,
 * showing a project label on the section detail page, grouping by client.
 *
 * Two reference shapes on section.json.context:
 *   "mr-halden-miller"          \u2192 floats to the latest metadata on disk
 *   "mr-halden-miller@2.0.0"    \u2192 pinned (version field is informational only
 *                                  in this metadata-only world)
 *
 * `null`, undefined, or `"_neutral"` \u2192 section has no associated project.
 *
 * Architecture: `decision-marketplace-frozen-section-bundles.md` in the
 * workspace tracker. Supersedes the CSS-bundle approach from
 * `decision-section-brand-contexts.md` (2026-05-13).
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

// Resolve relative to process.cwd() so the resolver finds brand-contexts/
// in both local dev AND Vercel serverless functions. Next.js sets
// process.cwd() to the project root in both environments.
const CONTEXTS_DIR = join(process.cwd(), "brand-contexts");

export type BrandContextStatus = "active" | "deprecated";

export type BrandContextMeta = {
  id: string;
  name: string;
  /** Optional human-readable client tag. Multiple projects can share one client. */
  client?: string;
  version: string;
  description: string;
  author: string;
  originatingProject: string | null;
  created: string;
  updated: string;
  status: BrandContextStatus;
  /** List of section ids that reference this project. Maintained by build-manifest. */
  sectionsUsing: string[];
};

export type ResolvedBrandContext = {
  id: string;
  /** Present iff caller pinned (e.g. "mr-halden-miller@2.0.0"). Informational only. */
  requestedVersion: string | null;
  /** Actual version on disk. */
  resolvedVersion: string;
  meta: BrandContextMeta;
};

/**
 * Parse a `section.json.context` reference into `{ id, version }`.
 * Returns `null` for null/undefined/empty/_neutral — caller should treat the
 * section as having no associated project.
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
 * Resolve a `section.json.context` reference into the matching brand context
 * metadata. Returns null when the reference is empty/_neutral OR the context
 * directory doesn't exist on disk.
 */
export function resolveBrandContext(
  ref: string | null | undefined,
): ResolvedBrandContext | null {
  const parsed = parseContextReference(ref);
  if (!parsed) return null;
  const meta = readBrandContextMeta(parsed.id);
  if (!meta) return null;
  return {
    id: parsed.id,
    requestedVersion: parsed.version,
    resolvedVersion: meta.version,
    meta,
  };
}

/**
 * List all brand contexts that exist on disk. Used by:
 *   - the build script to write `brand-contexts/index.json`
 *   - the Library App to render the Projects filter / "Browse by brand"
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
