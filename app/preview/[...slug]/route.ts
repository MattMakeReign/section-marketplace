import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadManifest } from "../../marketplace-data";

/**
 * Static preview asset route.
 *
 * URL: `/preview/<sectionId>` → serves the file at `<section.path>/<previews.static>`.
 *
 * The catch-all `[...slug]` is ignored beyond its first segment; we look up
 * the section by id and resolve the preview file via the manifest's `path`
 * field. This keeps preview filenames flexible (preview.svg today, preview.png
 * once real screenshots replace placeholders) without changing URLs.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const id = slug?.[0];
  if (!id) return new Response("Not found", { status: 404 });

  const manifest = await loadManifest();
  const section = manifest.sections?.find((s) => s.id === id);
  if (!section || !section.path || !section.previews?.static) {
    return new Response("Preview not found", { status: 404 });
  }

  const file = path.join(process.cwd(), section.path, section.previews.static);
  try {
    const buf = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const type =
      ext === ".svg" ? "image/svg+xml" :
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      "application/octet-stream";
    return new Response(buf as BodyInit, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new Response("Preview not found", { status: 404 });
  }
}
