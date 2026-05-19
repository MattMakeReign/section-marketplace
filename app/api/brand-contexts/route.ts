/**
 * GET /api/brand-contexts
 *
 * Returns the brand-contexts index — every context the marketplace knows about,
 * plus which sections reference each.
 *
 * Consumed by:
 *   - the Library App's "Browse by brand" filter
 *   - the local agent during `mr submit`, so it can dedupe against existing
 *     contexts before writing a new one
 *
 * No auth in V2 — team-only model. The endpoint reads `brand-contexts/index.json`
 * built at deploy time by `scripts/build-manifest.ts`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ContextsManifest = {
  generated: string;
  count: number;
  contexts: Array<Record<string, unknown>>;
};

export async function GET() {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "brand-contexts", "index.json"),
      "utf8",
    );
    const manifest = JSON.parse(raw) as ContextsManifest;
    return NextResponse.json({
      ok: true,
      generated: manifest.generated,
      count: manifest.count,
      contexts: manifest.contexts ?? [],
    });
  } catch (err) {
    // No index yet — return empty rather than 500 so callers can treat
    // "no contexts" as a valid state during early-rollout.
    const msg = (err as Error).message ?? String(err);
    if (msg.includes("ENOENT")) {
      return NextResponse.json({
        ok: true,
        generated: null,
        count: 0,
        contexts: [],
      });
    }
    return NextResponse.json(
      { ok: false, code: "contexts_index_failed", error: msg },
      { status: 500 },
    );
  }
}
