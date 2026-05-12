import { loadManifest } from "./marketplace-data";
import { Gallery } from "./gallery";

/**
 * Marketplace gallery — server component entry.
 *
 * Loads the registry from disk on the server, then hands a serializable
 * `Manifest` to the client `<Gallery />` for filtering / browsing.
 */
export default async function Page() {
  const manifest = await loadManifest();
  return <Gallery manifest={manifest} />;
}
