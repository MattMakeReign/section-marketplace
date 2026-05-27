/**
 * @mr/section-editors — editor primitives every section can compose into its
 * right-side editor panel.
 *
 * Used by:
 *  - `@mr/editor-controls-prototype` — the canonical visual fine-tuner where
 *    we iterate on the look and interaction of the controls themselves.
 *  - `@mr/browser-workspace` — the in-builder editor panel. Sections export
 *    an `editor.tsx` co-located with their component file; the workspace
 *    dynamically imports it and mounts whichever primitives it composes
 *    inside the floating <EditorPanel>.
 *
 * Consumers must import the stylesheet once at the root of their app:
 *
 *   import "@mr/section-editors/styles.css";
 *
 * The stylesheet consumes `--chrome-*` tokens only (no hardcoded colours /
 * radii / sizes), so the controls automatically adopt the host's chrome
 * theme. The host must define those tokens — see browser-workspace/src/
 * chrome.css for the canonical set.
 */

// Contract types + loader (see CONVENTION.md for the co-location rule)
export type {
  SectionEditor,
  SectionEditorProps,
} from "./types";
export { loadSectionEditor } from "./types";

// Shell
export { EditorPanel } from "./primitives/editor-panel";
export { EditorRow } from "./primitives/editor-row";
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./primitives/accordion";

// Core 5 (the controls every editor will reach for first)
export { FillSlider } from "./primitives/fill-slider";
export { Segmented } from "./primitives/segmented";
export { Stepper } from "./primitives/stepper";
export { Toggle } from "./primitives/toggle";
export { MediaManager, type MediaItem } from "./primitives/media-manager";

// Library (use when the core 5 don't fit)
export { NumberInput } from "./primitives/number-input";
export { ColorSwatch } from "./primitives/color-swatch";
export { Select } from "./primitives/select";
export { MultiToggle } from "./primitives/multi-toggle";
export { RangeSlider } from "./primitives/range-slider";
export { AspectPicker, type AspectValue } from "./primitives/aspect-picker";
export { ListEditor, type ListItem } from "./primitives/list-editor";
