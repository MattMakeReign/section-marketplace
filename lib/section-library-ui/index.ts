/**
 * @mr/section-library-ui — shared UI primitives for the Section Library.
 *
 * Consumed by:
 *  - `@mr/section-marketplace` (the standalone Section Library App on :3020)
 *  - `@mr/browser-workspace` (the in-builder Section Library Preview Tool)
 *
 * Both surfaces import from this one package so the editorial card, filter
 * pills, badges, and supporting types/icons render identically and stay in
 * lockstep when the design evolves.
 *
 * Consumers must also import the package's CSS once at the root of their app:
 *
 *   import "@mr/section-library-ui/styles.css";
 */

export * from "./types";
export * from "./components";
export * from "./icons";
export * from "./lifecycle-transitions";
export * from "./curation-vocab";
