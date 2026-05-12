import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { loadManifest } from "../../marketplace-data";

/**
 * Section README route.
 *
 * URL: `/readme/<sectionId>` → returns the section's `README.md` rendered to
 * HTML. The manifest's `path` field is the source of truth for the section
 * folder; we look for `README.md` (then `Readme.md` then `readme.md`) inside.
 *
 * Returned as a JSON envelope `{ html, raw }` so the client can decide how
 * to render (HTML for prose mode, raw markdown for a copy-to-Claude flow
 * later if we add it).
 */

marked.use({
  gfm: true,
  breaks: false,
});

const README_CANDIDATES = ["README.md", "Readme.md", "readme.md"];

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const id = slug?.[0];
  if (!id) return jsonError(404, "section id missing");

  const manifest = await loadManifest();
  const section = manifest.sections?.find((s) => s.id === id);
  if (!section || !section.path) return jsonError(404, `section not found: ${id}`);

  const folder = path.join(process.cwd(), section.path);
  for (const name of README_CANDIDATES) {
    const file = path.join(folder, name);
    try {
      const raw = await readFile(file, "utf8");
      const html = await marked.parse(raw);
      return Response.json({ ok: true, html, raw });
    } catch {
      // try next candidate
    }
  }
  return jsonError(404, `no README found in ${section.path}`);
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
