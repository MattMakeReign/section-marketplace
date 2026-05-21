/**
 * <Section> — re-export shell.
 *
 * Per `task-marketplace-runtime-frozen-wrapper` (2026-05-21): the marketplace
 * must render sections PIXEL-IDENTICAL to their origin project. The `<Section>`
 * primitive lives in `@mr/canonical-stack` (vendored at `lib/canonical-stack/`)
 * and every consumer points at the same source — no per-project drift.
 *
 * This file is a thin shell so existing `@/components/section` imports keep
 * resolving. Edit the primitive at `lib/canonical-stack/section.tsx`, not here.
 */

export { Section, selectorForSlug } from "@mr/canonical-stack";
export type { SectionProps } from "@mr/canonical-stack";
