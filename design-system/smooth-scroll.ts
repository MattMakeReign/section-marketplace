/*
 * smooth-scroll.ts — Lenis singleton + GSAP ticker integration.
 *
 * Lenis is the canonical smooth-scroll runtime (decision-canonical-section-stack).
 * It must be a singleton at app root; sections never instantiate their own.
 *
 * Wiring (official Lenis × GSAP pattern):
 *   - Lenis drives ScrollTrigger.update on every scroll event
 *   - GSAP's ticker drives lenis.raf — single animation loop, no double-RAF
 *   - lagSmoothing disabled so scrub animations stay 1:1 with scroll
 *
 * IMPORTANT: This module imports Lenis and must only be used from CLIENT
 * components. Mark any consuming file with "use client" at the top.
 */

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let instance: Lenis | null = null;

/**
 * Install the Lenis singleton and wire it to GSAP's ticker + ScrollTrigger.
 * Idempotent — safe to call multiple times.
 *
 * Honours prefers-reduced-motion by disabling Lenis's smoothing entirely
 * (native scroll feels right for users who opted out).
 *
 * Returns a teardown that removes the ticker callback and destroys the
 * Lenis instance. Call from the cleanup of the provider that owns it.
 */
export function installSmoothScroll(): () => void {
  if (typeof window === "undefined") return () => {};
  if (instance) return () => {}; // already installed; provider owns lifecycle

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  instance = new Lenis({
    // Conservative defaults that match the project's restrained motion language.
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !reduceMotion,
    // touchMultiplier left at default — Lenis already passes through native touch.
  });

  // Lenis → ScrollTrigger
  instance.on("scroll", ScrollTrigger.update);

  // GSAP ticker → Lenis RAF (single animation loop)
  const tick = (time: number) => {
    instance?.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    instance?.destroy();
    instance = null;
  };
}

/** Get the active Lenis instance (or null if not installed yet). */
export function getSmoothScroll(): Lenis | null {
  return instance;
}
