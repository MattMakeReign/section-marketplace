/**
 * design-system/motion — re-export shell.
 *
 * Per `task-marketplace-runtime-frozen-wrapper` (2026-05-21): the marketplace
 * must use the EXACT same motion runtime as the origin project. Forks drift.
 * Source of truth: `@mr/canonical-stack` (vendored at `lib/canonical-stack/`).
 *
 * Edit the runtime at `lib/canonical-stack/motion.ts`, not here.
 */

export {
  DURATIONS,
  EASES,
  DENSITY_MULTIPLIERS,
  getDensity,
  getDensityMultiplier,
  setDensity,
  installMotion,
  createMatchMedia,
  reveal,
  hoverScale,
  scrollIn,
  prefersReducedMotion,
} from "@mr/canonical-stack";

export type {
  DurationKey,
  EaseKey,
  MotionDensity,
  RevealOptions,
  HoverOptions,
  ScrollInOptions,
} from "@mr/canonical-stack";
