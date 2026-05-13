/**
 * /sections/[id] — section detail page.
 *
 * Server component: loads the manifest entry and hands it to the client
 * <Detail /> component. Full-viewport experience replaces the previous
 * grid-modal: the section's rendered preview IS the page; everything else
 * (tags, specs, install, curator actions) lives behind togglable drawers.
 */

import { notFound } from "next/navigation";
import { loadManifest } from "../../marketplace-data";
import { Detail } from "./detail";

type SearchParams = Promise<{ mode?: string }>;
type RouteParams = Promise<{ id: string }>;

export default async function Page({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const manifest = await loadManifest();
  const section = manifest.sections.find((s) => s.id === id);
  if (!section) notFound();

  // The full filtered list — so the detail page can offer prev/next nav
  // through whatever the gallery was showing. We don't have access to the
  // active filters from the URL yet (gallery state is client-only), so the
  // initial implementation just walks the full manifest in manifest order.
  const order = manifest.sections.map((s) => s.id);

  return (
    <Detail
      section={section}
      order={order}
      curatorMode={mode === "curate"}
    />
  );
}
