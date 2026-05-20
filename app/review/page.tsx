/**
 * /review — curator's review queue.
 *
 * Server Component. Loads index.json, filters to the active curation states
 * (Submitted / InReview / Approved), and hands the result to the client-side
 * <ReviewQueue /> for filtering + inline actions.
 *
 * This route is the answer to "I have no idea where to find the things waiting
 * to be promoted" — it's the curator's home base. Anything earlier in the
 * lifecycle (Local / Draft) hasn't been submitted yet; anything later (Promoted
 * / Deprecated / Archived) is already settled.
 */

import { loadManifest } from "../marketplace-data";
import { ReviewQueue } from "./queue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const manifest = await loadManifest();
  const sections = manifest.sections ?? [];
  return <ReviewQueue sections={sections} />;
}
