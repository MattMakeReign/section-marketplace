import { loadManifest, loadBrandContexts } from "./marketplace-data";
import { Gallery } from "./gallery";

/**
 * Marketplace gallery — server component entry.
 *
 * Loads the registry + brand-context metadata from disk on the server, then
 * hands serializable props to the client `<Gallery />` for filtering /
 * browsing. Brand contexts drive the Projects filter pill.
 */
export default async function Page() {
  const [manifest, brandContexts] = await Promise.all([
    loadManifest(),
    loadBrandContexts(),
  ]);
  return <Gallery manifest={manifest} brandContexts={brandContexts.contexts} />;
}
