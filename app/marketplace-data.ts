/**
 * Server-only manifest loader for the Section Library App.
 *
 * Types come from `@mr/section-library-ui`. This file is just the loader —
 * a Server Component imports it, the result flows down to client code as a
 * serializable prop.
 *
 * No in-memory cache: the gallery is the round-trip surface for `mr submit`
 * (and the in-builder Section Library Preview Tool). A cache would silently
 * break the loop when designers submit while the dev server is up. JSON read
 * on each request is cheap.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

// Re-export the shared types so existing consumers (e.g. older imports
// `import type { Manifest } from "./marketplace-data"`) keep working.
export type {
  Manifest,
  ManifestEntry,
  Track,
  Lifecycle,
  Attribution,
} from "@mr/section-library-ui";

import type { Manifest } from "@mr/section-library-ui";

export async function loadManifest(): Promise<Manifest> {
  const file = path.join(process.cwd(), "index.json");
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as Manifest;
}

export type BrandContextEntry = {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  originatingProject?: string | null;
  status?: "active" | "deprecated";
  tokensHash?: string | null;
  sectionsUsing?: string[];
};

export type BrandContextsManifest = {
  generated: string | null;
  count: number;
  contexts: BrandContextEntry[];
};

/**
 * Read `brand-contexts/index.json`. Returns an empty manifest if the file
 * isn't built yet — sections still render, the badge just hides.
 */
export async function loadBrandContexts(): Promise<BrandContextsManifest> {
  const file = path.join(process.cwd(), "brand-contexts", "index.json");
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as BrandContextsManifest;
  } catch {
    return { generated: null, count: 0, contexts: [] };
  }
}
