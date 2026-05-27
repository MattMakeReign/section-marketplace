/**
 * @mr/canonical-stack — the single source of truth for the MakeReign
 * section runtime. Motion (GSAP), smooth-scroll (Lenis), section
 * primitives, and responsive helpers — all served from one package
 * so an upgrade lands everywhere in a single edit.
 *
 * Consumed by:
 *  - `@mr/starter-pack` (the baseline `mr new` forks from)
 *  - every client project under `repos/client-projects/*`
 *  - `@mr/section-marketplace` (the marketplace previewer at `/render/[id]`)
 *
 * Consumers must also import the package's CSS once at the root of their app:
 *
 *   import "@mr/canonical-stack/styles.css";
 */

export * from "./motion";
export * from "./smooth-scroll";
export * from "./responsive";
export * from "./wireframe";
export { MotionProvider } from "./motion-provider";
export { useReveal } from "./reveal";
export type { RevealOptions } from "./reveal";
export { useDialkitTheme } from "./dialkit-theme";
export type { DialkitTheme } from "./dialkit-theme";
export { Section, selectorForSlug } from "./section";
export type { SectionProps } from "./section";
export { SectionGrid } from "./section-grid";
export type {
  NavPage,
  NavSectionProps,
  FooterSectionProps,
  SettingsFieldType,
  SettingsField,
  SettingsSchema,
  GlobalSlot,
} from "./section-contract";
