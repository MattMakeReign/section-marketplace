"use client";

/**
 * Client-side dynamic loader for /render/[id].
 *
 * `next/dynamic` with a templated path — webpack expands the template at
 * build time into one chunk per matching section directory, so any new
 * section added to `sections/<cat>/<id>/index.tsx` automatically gets a
 * preview route. No import-map file to keep in sync.
 *
 * Sections export their root component either as `default` or as a named
 * export — unwrap both shapes so submission convention doesn't matter.
 */

import dynamic from "next/dynamic";
import { useMemo, type ComponentType } from "react";

export function LiveRenderClient({ category, id }: { category: string; id: string }) {
  const Section = useMemo<ComponentType<Record<string, unknown>>>(() => {
    return dynamic(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        import(`@/sections/${category}/${id}/index`).then((mod: any) => {
          const Comp =
            mod.default ?? Object.values(mod).find((v) => typeof v === "function");
          if (!Comp) {
            throw new Error(`Section "${id}" has no default export and no named component export`);
          }
          return { default: Comp as ComponentType<Record<string, unknown>> };
        }),
      {
        ssr: false,
        loading: () => <div className="mr-render-loading" />,
      },
    );
  }, [category, id]);

  return <Section />;
}
