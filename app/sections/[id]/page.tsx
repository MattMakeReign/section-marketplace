/**
 * /sections/[id] — section detail page.
 *
 * Server component: loads the manifest entry and hands it to the client
 * <Detail /> component. Full-viewport experience replaces the previous
 * grid-modal: the section's rendered preview IS the page; everything else
 * (tags, specs, install, curator actions) lives behind togglable drawers.
 */

import { notFound } from "next/navigation";
import { getLifecycle } from "@mr/section-library-ui";
import { loadManifest, loadBrandContexts } from "../../marketplace-data";
import { Detail } from "./detail";

type RouteParams = Promise<{ id: string }>;

export default async function Page({ params }: { params: RouteParams }) {
  const { id } = await params;
  const [manifest, contexts] = await Promise.all([loadManifest(), loadBrandContexts()]);
  const section = manifest.sections.find((s) => s.id === id);
  if (!section) notFound();

  // Prev/next nav order is lifecycle-scoped so the user never jumps out of
  // the context they came from. The default gallery hides Archived +
  // Deprecated, so live-section nav skips them too. The archive list is
  // its own pool — viewing an archived section only navigates between
  // other archived sections.
  const currentLifecycle = getLifecycle(section);
  const order = manifest.sections
    .filter((s) => {
      const lc = getLifecycle(s);
      if (currentLifecycle === "Archived") return lc === "Archived";
      if (currentLifecycle === "Deprecated") return lc === "Deprecated";
      return lc !== "Archived" && lc !== "Deprecated";
    })
    .map((s) => s.id);

  return (
    <Detail
      section={section}
      order={order}
      brandContexts={contexts.contexts}
    />
  );
}
