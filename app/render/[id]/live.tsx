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
 *
 * When the section ships an `editor.tsx`, we ALSO dynamically import that
 * and wrap the section in <SectionEditorMount> so the marketplace preview
 * shows the same dialkit panel the user will see when they install the
 * section into a project. Without editor.tsx, the section renders bare.
 */

import dynamic from "next/dynamic";
import { useMemo, type ComponentType } from "react";
import type { SectionEditor } from "@mr/section-editors";
import { SectionEditorMount } from "@/components/section-editor-mount";

type AnyProps = Record<string, unknown>;

export function LiveRenderClient({
  category,
  id,
  label,
  defaultProps,
  editorAvailable,
}: {
  category: string;
  id: string;
  label: string;
  defaultProps: AnyProps | null;
  editorAvailable: boolean;
}) {
  const Section = useMemo<ComponentType<AnyProps>>(() => {
    return dynamic(
      () =>
        import(
          /* webpackInclude: /index\.tsx$/ */
          /* webpackChunkName: "section-[request]" */
          `@/sections/${category}/${id}/index`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).then((mod: any) => {
          const Comp =
            mod.default ?? Object.values(mod).find((v) => typeof v === "function");
          if (!Comp) {
            throw new Error(`Section "${id}" has no default export and no named component export`);
          }
          return { default: Comp as ComponentType<AnyProps> };
        }),
      {
        ssr: false,
        loading: () => <div className="mr-render-loading" />,
      },
    );
  }, [category, id]);

  // Lazy-load the editor too. Wrapped in a ComponentType so next/dynamic can
  // resolve it through the same templated-import mechanism the section uses.
  // `ssr: false` is REQUIRED — editor.tsx imports dialkit primitives that
  // depend on browser APIs. The mount handles the loading fallback.
  const EditorWrapper = useMemo(() => {
    if (!editorAvailable) return null;
    return dynamic(
      () =>
        import(
          /* webpackInclude: /editor\.tsx$/ */
          /* webpackChunkName: "section-editor-[request]" */
          `@/sections/${category}/${id}/editor`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).then((mod: any) => {
          const E =
            mod.default ?? Object.values(mod).find((v) => typeof v === "function");
          if (!E) {
            throw new Error(`Editor for "${id}" has no default export`);
          }
          // Wrap the SectionEditor functional value in a ComponentType
          // shell so next/dynamic — which expects a React component
          // module — accepts it cleanly.
          const ResolvedEditor = E as SectionEditor<AnyProps>;
          const Wrapper: ComponentType<{ section: ComponentType<AnyProps> }> = ({ section }) => (
            <SectionEditorMount
              section={section}
              editor={ResolvedEditor}
              defaultProps={defaultProps ?? {}}
              label={label}
            />
          );
          return { default: Wrapper };
        }),
      {
        ssr: false,
        loading: () => null,
      },
    );
  }, [category, id, editorAvailable, defaultProps, label]);

  // No editor → render the section bare, same as the original /render/[id]
  // behaviour. Section reads its function-arg defaults (which per the
  // 2026-05-25 standing rule are sourced from sample.json).
  if (!EditorWrapper) {
    return <Section />;
  }

  return <EditorWrapper section={Section} />;
}
