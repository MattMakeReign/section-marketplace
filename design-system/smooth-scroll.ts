/**
 * design-system/smooth-scroll — re-export shell.
 *
 * Per `task-marketplace-runtime-frozen-wrapper` (2026-05-21): Lenis runtime
 * must match the origin project's Lenis runtime EXACTLY. Source of truth:
 * `@mr/canonical-stack` (vendored at `lib/canonical-stack/`).
 *
 * Edit the runtime at `lib/canonical-stack/smooth-scroll.ts`, not here.
 */

export { installSmoothScroll, getSmoothScroll } from "@mr/canonical-stack";
