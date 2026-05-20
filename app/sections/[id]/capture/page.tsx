/**
 * /sections/[id]/capture — section video recorder.
 *
 * Server entry: looks up the section manifest entry, passes it to the
 * client capture surface. The capture flow is end-to-end browser-side:
 * MediaRecorder records the tab via getDisplayMedia, ffmpeg.wasm trims +
 * compresses the resulting clip, a chosen frame becomes the static
 * thumbnail. On save we upload both to Supabase Storage and persist the
 * URLs on section.json via the curation endpoint.
 *
 * No marketplace chrome on this route — full-viewport dark workspace for
 * the recording surface. Rendered chromeless via the absence of the
 * marketplace topbar (this folder is outside any layout that wraps in
 * chrome — Next.js applies the closest parent layout which is the root
 * layout.tsx mounting the topbar; we override that by rendering a custom
 * shell directly in the client component).
 */
import { notFound } from "next/navigation";
import { loadManifest } from "../../../marketplace-data";
import { CaptureClient } from "./capture-client";

type RouteParams = Promise<{ id: string }>;

export default async function Page({ params }: { params: RouteParams }) {
  const { id } = await params;
  const manifest = await loadManifest();
  const section = manifest.sections.find((s) => s.id === id);
  if (!section) notFound();

  return <CaptureClient section={section} />;
}
