/**
 * POST /api/sections/[id]/preview-upload
 *
 * Curator drop-zone target for the section detail page's video clip. Accepts
 * a multipart form with one file under the field name "file"; uploads the
 * bytes to Supabase Storage; returns the public URL.
 *
 * The caller is expected to PUT the returned URL into section.json via
 * /api/sections/[id]/curation with `previewVideoUrl` — this endpoint ONLY
 * uploads the bytes, it does NOT mutate the manifest. Keeps the two
 * responsibilities separate (uploads can fail loud without polluting the
 * manifest; URL writes happen in one place).
 *
 * Constraints:
 *   - Max 15 MB (matches the bucket's file_size_limit)
 *   - Allowed mime: video/mp4, video/webm, image/png, image/jpeg, image/webp
 *   - Object path: <sectionId>/preview.<ext>
 *
 * The same endpoint handles both the rollover video and the pre-rollover
 * static thumbnail (the capture tool at /sections/[id]/capture POSTs both).
 */

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  uploadPreviewAsset,
  isSupabaseStorageConfigured,
  SupabaseStorageError,
} from "@/lib/supabase-storage";
import { type ManifestEntry, type Manifest } from "@mr/section-library-ui";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  "video/webm": "webm",
  "video/mp4": "mp4",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type IndexJson = Manifest & { sections?: ManifestEntry[] };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "supabase_not_configured",
        error:
          "Supabase Storage is not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in repos/section-marketplace/.env.local.",
      },
      { status: 503 },
    );
  }

  // Sanity-check that the section exists before accepting the upload.
  // (Cheap — saves a Supabase round-trip for typo'd ids.)
  const root = process.cwd();
  try {
    const index = JSON.parse(await readFile(path.join(root, "index.json"), "utf8")) as IndexJson;
    const entry = (index.sections ?? []).find((s) => s.id === id);
    if (!entry) {
      return NextResponse.json(
        { ok: false, code: "not_found", error: `section "${id}" not found` },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, code: "not_found", error: "index.json missing — run `pnpm build`" },
      { status: 500 },
    );
  }

  // Parse multipart form.
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, code: "invalid_args", error: `expected multipart form: ${(err as Error)?.message ?? err}` },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, code: "invalid_args", error: "form field 'file' is required and must be a File" },
      { status: 400 },
    );
  }

  // Validate.
  if (file.size === 0) {
    return NextResponse.json(
      { ok: false, code: "invalid_args", error: "uploaded file is empty" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        code: "too_large",
        error: `file is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB`,
      },
      { status: 413 },
    );
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_type",
        error: `unsupported file type: ${file.type}. Allowed: ${Object.keys(ALLOWED_MIME).join(", ")}`,
      },
      { status: 415 },
    );
  }

  // Upload.
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const result = await uploadPreviewAsset({
      objectPath: `${id}/preview.${ext}`,
      body: bytes,
      contentType: file.type,
    });
    return NextResponse.json({
      ok: true,
      url: result.url,
      objectPath: result.objectPath,
      size: result.size,
    });
  } catch (err: unknown) {
    if (err instanceof SupabaseStorageError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, code: "upload_failed", error: (err as Error)?.message ?? String(err) },
      { status: 500 },
    );
  }
}
