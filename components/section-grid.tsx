/**
 * <SectionGrid> — re-export shell.
 *
 * Per `task-marketplace-runtime-frozen-wrapper` (2026-05-21): the marketplace
 * must render sections PIXEL-IDENTICAL to their origin project. The grid
 * primitive lives in `@mr/canonical-stack` (vendored at `lib/canonical-stack/`)
 * and every consumer points at the same source — no per-project drift.
 *
 * Edit the primitive at `lib/canonical-stack/section-grid.tsx`, not here.
 */

export { SectionGrid } from "@mr/canonical-stack";
