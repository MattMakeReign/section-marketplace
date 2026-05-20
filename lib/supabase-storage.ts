/**
 * Server-side Supabase Storage helper for the marketplace.
 *
 * Used by /api/sections/[id]/preview-upload to push curator-uploaded video
 * clips into the `section-previews` bucket. Avoids the `@supabase/supabase-js`
 * dependency — Supabase Storage has a plain REST API that fetch can talk to.
 *
 * Env vars (set in repos/section-marketplace/.env.local):
 *   - SUPABASE_URL                 e.g. https://iqmrrjqggqvyzcpdrxkz.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY    server-only; bypasses RLS for uploads
 *   - SUPABASE_PREVIEW_BUCKET      defaults to "section-previews"
 *
 * NEVER ship the service role key to the client. This module is server-only
 * (Next.js API routes / server components).
 */

export class SupabaseStorageError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function readEnv() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = (process.env.SUPABASE_PREVIEW_BUCKET ?? "section-previews").trim();
  if (!url) {
    throw new SupabaseStorageError(
      "not_configured",
      "SUPABASE_URL is not set in repos/section-marketplace/.env.local.",
    );
  }
  if (!key || key === "PASTE_SERVICE_ROLE_KEY_HERE") {
    throw new SupabaseStorageError(
      "not_configured",
      "SUPABASE_SERVICE_ROLE_KEY is not set — grab it from the Supabase dashboard and paste into repos/section-marketplace/.env.local.",
    );
  }
  return { url, key, bucket };
}

export function publicUrlFor(objectPath: string): string {
  const env = readEnv();
  const cleanPath = objectPath.replace(/^\/+/, "");
  return `${env.url}/storage/v1/object/public/${env.bucket}/${cleanPath}`;
}

/**
 * Upload bytes to the section-previews bucket. Upserts — re-uploading the
 * same path overwrites the existing object.
 */
export async function uploadPreviewAsset({
  objectPath,
  body,
  contentType,
}: {
  objectPath: string;
  body: Buffer | ArrayBuffer | Uint8Array;
  contentType: string;
}): Promise<{ url: string; objectPath: string; size: number }> {
  if (typeof objectPath !== "string" || objectPath.length === 0) {
    throw new SupabaseStorageError("invalid_args", "objectPath is required");
  }
  if (typeof contentType !== "string" || contentType.length === 0) {
    throw new SupabaseStorageError("invalid_args", "contentType is required");
  }

  const env = readEnv();
  const cleanPath = objectPath.replace(/^\/+/, "");
  const uploadUrl = `${env.url}/storage/v1/object/${env.bucket}/${cleanPath}`;

  // Normalise body into an ArrayBuffer slice — fetch's BodyInit accepts
  // BufferSource which includes ArrayBuffer and SharedArrayBuffer-free views.
  const bytes: Uint8Array =
    body instanceof Uint8Array
      ? body
      : body instanceof ArrayBuffer
        ? new Uint8Array(body)
        : new Uint8Array(body);
  // Detach the underlying ArrayBuffer for fetch — Node's TS types are
  // picky about typed-array views.
  const arrayBufferBody: ArrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.key}`,
        "Content-Type": contentType,
        "x-upsert": "true",
        "Cache-Control": "public, max-age=300",
      },
      body: arrayBufferBody,
    });
  } catch (err: unknown) {
    throw new SupabaseStorageError(
      "network_error",
      `Failed to reach Supabase Storage at ${env.url}: ${(err as Error)?.message ?? err}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SupabaseStorageError(
      "upload_failed",
      `Supabase Storage rejected upload (${res.status} ${res.statusText}): ${text || "no body"}`,
    );
  }

  return {
    url: publicUrlFor(cleanPath),
    objectPath: cleanPath,
    size: arrayBufferBody.byteLength,
  };
}

export function isSupabaseStorageConfigured(): boolean {
  try {
    readEnv();
    return true;
  } catch {
    return false;
  }
}
