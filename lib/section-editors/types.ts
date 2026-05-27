import type { ComponentType } from "react";

/**
 * SectionEditor — the contract every section's `editor.tsx` default export
 * must satisfy.
 *
 * The section author writes:
 *
 *   // sections/team/team-grid-dark/editor.tsx
 *   const Editor: SectionEditor<TeamGridProps> = ({ props, onChange }) => {
 *     return (
 *       <Accordion type="multiple" defaultValue={["media"]}>
 *         …
 *       </Accordion>
 *     );
 *   };
 *   export default Editor;
 *
 * Browser-workspace dynamically imports this module when the matching section
 * is selected in canvas, and mounts the result inside the floating
 * <EditorPanel>. See CONVENTION.md for the full co-location rule.
 *
 * - `props` is the section's current prop values (read from the page JSX or
 *   the section's defaults at mount time)
 * - `onChange` accepts a partial patch; the workspace merges it into the
 *   current state and persists it to disk (persistence path is tracked in
 *   `task-section-instance-prop-persistence`)
 */
export type SectionEditorProps<P> = {
  props: P;
  onChange: (next: Partial<P>) => void;
};

export type SectionEditor<P> = ComponentType<SectionEditorProps<P>>;

/**
 * Loader signature for dynamic imports. The consumer passes its own importer
 * function (typically a bare `import()` call) so module-resolution stays in
 * the consumer's bundler context rather than the package's.
 *
 * Returns the default-exported editor, or null when no editor.tsx exists.
 *
 * Usage from browser-workspace:
 *
 *   const Editor = await loadSectionEditor(
 *     () => import(`@/sections/${id}/editor`)
 *   );
 *   if (!Editor) return <NoControlsEmpty />;
 *   return <EditorPanel><Editor props={current} onChange={update} /></EditorPanel>;
 */
export async function loadSectionEditor<P>(
  importer: () => Promise<{ default: SectionEditor<P> } | unknown>,
): Promise<SectionEditor<P> | null> {
  try {
    const mod = await importer();
    if (mod && typeof mod === "object" && "default" in mod) {
      return (mod as { default: SectionEditor<P> }).default;
    }
    return null;
  } catch {
    // Module not found (section has no editor.tsx) — that's not an error,
    // it's the empty state. Bubble up other errors via console; callers
    // should treat null as "show empty state".
    return null;
  }
}
