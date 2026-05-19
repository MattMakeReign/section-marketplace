/*
 * motion.ts — GSAP defaults, density tiers, reveal/hover helpers, matchMedia.
 *
 * Source of truth for *values* is design-system/tokens.css. The constants below
 * mirror the CSS tokens as JS numbers (GSAP wants seconds, not strings).
 *
 * IMPORTANT: This module imports GSAP and must only be used from CLIENT components.
 * Mark any consuming file with "use client" at the top.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ─────────────────────────────────────────────────────────────
// Token mirrors
// ─────────────────────────────────────────────────────────────

/** Durations in seconds. Mirrors --duration-* tokens. */
export const DURATIONS = {
  instant: 0.1,
  fast: 0.2,
  base: 0.3,
  slow: 0.5,
  deliberate: 0.8,
} as const;

export type DurationKey = keyof typeof DURATIONS;

/** Easings as cubic-bezier strings. Mirrors --ease-* tokens. */
export const EASES = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  in: "cubic-bezier(0.7, 0, 0.84, 0)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

export type EaseKey = keyof typeof EASES;

// ─────────────────────────────────────────────────────────────
// Density tiers
// ─────────────────────────────────────────────────────────────

/**
 * Motion density — categorical descriptor of how much motion shows in
 * a section's layout. Five tiers, low to high.
 *
 * Canonical meaning: amount of motion shown, NOT speed of each tween.
 * The multiplier (below) is an implementation convenience for the helpers.
 */
export type MotionDensity = "static" | "low" | "medium" | "high" | "experience";

/** How a tier scales reveal distances and durations. */
export const DENSITY_MULTIPLIERS: Record<MotionDensity, number> = {
  static: 0,
  low: 0.4,
  medium: 1,
  high: 1.5,
  experience: 2,
};

/** Read --motion-density from :root. Falls back to "medium". */
export function getDensity(): MotionDensity {
  if (typeof document === "undefined") return "medium";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--motion-density")
    .trim();
  if (v === "static" || v === "low" || v === "medium" || v === "high" || v === "experience") return v;
  return "medium";
}

/** Convenience — multiplier for the current density. */
export function getDensityMultiplier(): number {
  return DENSITY_MULTIPLIERS[getDensity()];
}

/** Set the density at runtime. Mutates --motion-density on :root. */
export function setDensity(density: MotionDensity): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--motion-density", density);
  document.documentElement.style.setProperty(
    "--motion-density-multiplier",
    String(DENSITY_MULTIPLIERS[density]),
  );
}

// ─────────────────────────────────────────────────────────────
// Boot-time install
// ─────────────────────────────────────────────────────────────

// Register plugins at module-evaluation time so sections that create
// ScrollTriggers inside their own useEffect (which fires BEFORE MotionProvider's
// useEffect — React effect order is bottom-up) don't get the "Missing plugin?
// gsap.registerPlugin()" warning + a no-op tween. Idempotent in GSAP.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

let installed = false;

/**
 * Install GSAP defaults. Plugin registration happens at module-load time
 * (see above) so it's safe for child components to use ScrollTrigger before
 * this provider's effect runs.
 *
 * Idempotent — safe to call multiple times.
 * Call once from a client-side provider on mount.
 */
export function installMotion(): void {
  if (installed) return;
  installed = true;
  gsap.defaults({
    duration: DURATIONS.base,
    ease: EASES.standard,
    overwrite: "auto",
  });
}

// ─────────────────────────────────────────────────────────────
// matchMedia — responsive + reduced-motion in one
// ─────────────────────────────────────────────────────────────

/**
 * Create a gsap.matchMedia() instance pre-configured with the standard breakpoints
 * + a `reduceMotion` flag. Pass a callback that runs once per matched condition set.
 *
 * Example:
 *   const mm = createMatchMedia(({ desktop, reduceMotion }) => {
 *     if (reduceMotion) return; // honour user preference
 *     if (desktop) gsap.from(".hero", { y: 40, opacity: 0 });
 *   });
 *
 * Always call mm.kill() on unmount.
 */
export function createMatchMedia(
  setup?: (ctx: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
    reduceMotion: boolean;
  }) => void | (() => void),
): gsap.MatchMedia {
  const mm = gsap.matchMedia();
  if (setup) {
    mm.add(
      {
        mobile: "(max-width: 47.99rem)",
        tablet: "(min-width: 48rem) and (max-width: 63.99rem)",
        desktop: "(min-width: 64rem)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const conditions = context.conditions as {
          mobile: boolean;
          tablet: boolean;
          desktop: boolean;
          reduceMotion: boolean;
        };
        return setup(conditions);
      },
    );
  }
  return mm;
}

// ─────────────────────────────────────────────────────────────
// Reveal / hover / scroll helpers
// ─────────────────────────────────────────────────────────────

/** Distance presets for reveal animations (px), pre-density-scale. */
const DISTANCES = { sm: 8, md: 16, lg: 32 } as const;
type DistanceKey = keyof typeof DISTANCES;

export interface RevealOptions {
  distance?: DistanceKey;
  duration?: DurationKey;
  ease?: EaseKey;
  delay?: number;
  stagger?: number;
}

/**
 * Reveal animation — fade + upward translate.
 * Scales distance and duration by current density multiplier.
 * Honours prefers-reduced-motion (no translate, half duration).
 */
export function reveal(
  target: gsap.TweenTarget,
  opts: RevealOptions = {},
): gsap.core.Tween {
  const {
    distance = "md",
    duration = "base",
    ease = "out",
    delay = 0,
    stagger,
  } = opts;
  const m = getDensityMultiplier();
  const reduce = prefersReducedMotion();
  return gsap.from(target, {
    y: reduce ? 0 : DISTANCES[distance] * m,
    opacity: 0,
    duration: (reduce ? DURATIONS[duration] / 2 : DURATIONS[duration]) * m,
    ease: EASES[ease],
    delay,
    stagger,
  });
}

export interface HoverOptions {
  scale?: number;
  duration?: DurationKey;
  ease?: EaseKey;
}

/**
 * Hover scale tween — returns a setter you call from onMouseEnter / onMouseLeave.
 * Returns { enter, leave } pair.
 */
export function hoverScale(
  target: gsap.TweenTarget,
  opts: HoverOptions = {},
): { enter: () => void; leave: () => void } {
  const { scale = 1.02, duration = "fast", ease = "standard" } = opts;
  return {
    enter: () =>
      gsap.to(target, { scale, duration: DURATIONS[duration], ease: EASES[ease] }),
    leave: () =>
      gsap.to(target, { scale: 1, duration: DURATIONS[duration], ease: EASES[ease] }),
  };
}

export interface ScrollInOptions extends RevealOptions {
  /** ScrollTrigger start position. Defaults to "top 80%". */
  start?: string;
}

/**
 * Scroll-triggered reveal. Animates when element enters the viewport.
 * Requires installMotion() to have run (registers ScrollTrigger).
 */
export function scrollIn(
  target: gsap.TweenTarget,
  opts: ScrollInOptions = {},
): gsap.core.Tween {
  const { start = "top 80%", ...revealOpts } = opts;
  const m = getDensityMultiplier();
  const reduce = prefersReducedMotion();
  const distance = revealOpts.distance ?? "md";
  const duration = revealOpts.duration ?? "base";
  const ease = revealOpts.ease ?? "out";
  return gsap.from(target, {
    y: reduce ? 0 : DISTANCES[distance] * m,
    opacity: 0,
    duration: (reduce ? DURATIONS[duration] / 2 : DURATIONS[duration]) * m,
    ease: EASES[ease],
    scrollTrigger: { trigger: target as Element, start, toggleActions: "play none none none" },
  });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
