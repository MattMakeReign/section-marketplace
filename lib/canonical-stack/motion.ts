/*
 * motion.ts — GSAP defaults, density tiers, reveal/hover helpers, matchMedia.
 *
 * Source of truth for *values* is each consuming project's design-system tokens.css.
 * The constants below mirror the CSS tokens as JS numbers (GSAP wants seconds, not strings).
 *
 * IMPORTANT: This module imports GSAP and must only be used from CLIENT components.
 * Mark any consuming file with "use client" at the top.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isWireframeMode } from "./wireframe";

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
 * Motion density — how much motion shows in a section's layout.
 *
 * This is a categorical descriptor of *quantity* of motion (how busy the
 * section feels), NOT a tween-speed or duration setting. It maps a section's
 * overall character — static = nothing moves, experience = many things in
 * motion (multiple scroll-triggered reveals, parallax, animated decorations).
 *
 * Lives in two places:
 *   - On every `section.json` as the `motionDensity` array (one or more tags
 *     describing what density tiers the section is appropriate at). Used by
 *     the marketplace Animation filter + AI enrichment.
 *   - At the project level as the `--motion-density` CSS variable, so the
 *     `reveal()` / `scrollIn()` helpers default-scale themselves consistently
 *     across a project. The multiplier (below) is an implementation
 *     convenience — designers think in tiers, not numbers.
 */
export type MotionDensity = "static" | "low" | "medium" | "high" | "experience";

/**
 * Multipliers the helpers use to scale reveal distance + duration.
 *
 * Tuned so `static` is genuinely no motion and `experience` is showpiece.
 * Values are pragmatic defaults — refine as real sections inform the curve.
 */
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

// ─────────────────────────────────────────────────────────────
// Wireframe mode — module-scope motion neutraliser
//
// The wireframe layer in styles.css already kills CSS transitions/animations.
// GSAP is a separate motion runtime that runs in JS — it sets inline styles
// on its targets, which CSS can't always reach. We neutralise GSAP at the
// SOURCE by monkey-patching its tween-creation methods.
//
// Once wireframe mode is detected (the init script in wireframe.ts sets the
// html attribute BEFORE React mounts, so this check happens with the right
// answer), every gsap.to/from/fromTo/timeline call gets duration: 0 + the
// scrollTrigger config stripped. End state is applied instantly. Sections
// that import gsap directly and run their own custom animations are caught
// just like sections that go through reveal()/scrollIn().
//
// Future-proofing rationale: any new section pulled from the marketplace
// must use this package's gsap import (canonical stack rule). Patching here
// covers everything that respects the rule. Sections that smuggle in their
// own gsap copy bypass this — but that violates the canonical-stack contract
// and would be a separate bug.
// ─────────────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  // Re-read attr fresh — wireframe.ts's getRenderMode() does the same check.
  const isWireframe = document.documentElement.getAttribute("data-mr-render") === "wireframe";
  if (isWireframe) {
    // In wireframe, every GSAP animation call collapses to a no-op:
    // `gsap.set(targets, { clearProps: "all" })`. This removes any
    // GSAP-applied inline styles (transforms, opacities, filters, etc.) so
    // the element renders at its NATURAL CSS state — exactly what a static
    // wireframe wants. The difference vs the previous duration-zero approach:
    //
    //   - `gsap.from(el, { y: 32, opacity: 0, duration: 0 })` was leaving
    //     the element stuck at y:32/opacity:0 (the from-state) instead of
    //     snapping to its target.
    //   - `gsap.to(img, { y: -212 })` was still applying y:-212 (the
    //     parallax target) — there's no "should I apply this value or not"
    //     heuristic GSAP can do.
    //
    // Killing every animation by clearing the affected props means sections
    // appear in the layout they were authored at, without any motion-coded
    // visual offsets. Returns a real Tween so callers that chain `.kill()`
    // or similar still work.
    const noop = (targets: gsap.TweenTarget) => gsap.set(targets, { clearProps: "all" });

    gsap.to = noop as typeof gsap.to;
    gsap.from = noop as typeof gsap.from;
    gsap.fromTo = noop as typeof gsap.fromTo;

    // Timeline: return a minimal object that implements the chained API
    // most sections use (.to / .from / .fromTo / .set / .add / .kill /
    // .play / .pause / .reverse / .progress). Each chained method also
    // no-ops to clearProps and returns `self` so chains don't break.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stubTimeline: any = {
      to: (t: gsap.TweenTarget) => (gsap.set(t, { clearProps: "all" }), stubTimeline),
      from: (t: gsap.TweenTarget) => (gsap.set(t, { clearProps: "all" }), stubTimeline),
      fromTo: (t: gsap.TweenTarget) => (gsap.set(t, { clearProps: "all" }), stubTimeline),
      set: (t: gsap.TweenTarget) => (gsap.set(t, { clearProps: "all" }), stubTimeline),
      add: () => stubTimeline,
      addLabel: () => stubTimeline,
      call: () => stubTimeline,
      kill: () => stubTimeline,
      play: () => stubTimeline,
      pause: () => stubTimeline,
      resume: () => stubTimeline,
      reverse: () => stubTimeline,
      restart: () => stubTimeline,
      seek: () => stubTimeline,
      progress: () => stubTimeline,
      timeScale: () => stubTimeline,
      duration: () => 0,
      totalDuration: () => 0,
      isActive: () => false,
      eventCallback: () => stubTimeline,
    };
    gsap.timeline = (() => stubTimeline) as typeof gsap.timeline;
  }
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
  // Wireframe mode: skip the reveal entirely so content paints in its
  // natural state. Returning a zero-duration tween is the cleanest way to
  // honour the API shape without forcing every caller to check the mode.
  if (isWireframeMode()) {
    return gsap.set(target, { clearProps: "transform,opacity" }) as unknown as gsap.core.Tween;
  }
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
  // Wireframe mode: no scroll-triggered animation. Element shows immediately
  // in its natural state — wireframe is a static deliverable.
  if (isWireframeMode()) {
    return gsap.set(target, { clearProps: "transform,opacity" }) as unknown as gsap.core.Tween;
  }
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
