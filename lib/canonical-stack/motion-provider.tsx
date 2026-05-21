"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { installMotion, createMatchMedia } from "./motion";
import { installSmoothScroll } from "./smooth-scroll";
import { isWireframeMode } from "./wireframe";

/**
 * MotionProvider — installs the canonical motion runtime once on mount:
 *   - GSAP defaults + plugin registration (ScrollTrigger)
 *   - gsap.matchMedia() container (responsive + reduced-motion)
 *   - Lenis smooth-scroll singleton, wired to GSAP's ticker + ScrollTrigger
 *
 * Mount once at the root of the app. Sections never instantiate motion or
 * smooth-scroll themselves — they consume what this provider sets up.
 *
 * Wireframe mode: Lenis is suspended so the page scrolls natively (no smooth
 * lerp). GSAP defaults still install (cheap, no visible effect) so existing
 * code paths that import from canonical-stack don't trip. Reveal/scrollIn
 * helpers short-circuit via `isWireframeMode()` checks in motion.ts.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installMotion();
    const mm = createMatchMedia();
    // Suspend Lenis in wireframe mode — smooth-scroll is an interaction
    // effect, not just an animation. Wireframe = native scroll.
    const teardownLenis = isWireframeMode() ? null : installSmoothScroll();

    // Wireframe defense-in-depth — the gsap monkey-patch in motion.ts handles
    // future animation calls, but anything that slipped through (a section
    // that captured a gsap method reference before the patch installed, or
    // a third-party motion lib that bypasses gsap entirely) gets neutered
    // here. 10× per second:
    //   1. Kill every ScrollTrigger.
    //   2. Fast-forward + kill every active tween.
    //   3. Scan the canvas for elements with INLINE transform/opacity/filter
    //      styles (the typical fingerprint of an active animation) and
    //      clear those inline styles so the element falls back to its CSS
    //      defined state.
    let wireframeHeartbeatId: number | null = null;
    if (isWireframeMode()) {
      wireframeHeartbeatId = window.setInterval(() => {
        ScrollTrigger.getAll().forEach((t) => t.kill(false));
        gsap.globalTimeline.getChildren(true, true, true).forEach((child) => {
          if (child.duration() > 0) {
            child.progress(1);
            child.kill();
          }
        });
        // Scan + clear inline animation props on canvas elements.
        const canvas = document.body;
        if (!canvas) return;
        const elements = canvas.querySelectorAll<HTMLElement>(
          '[style*="transform"], [style*="opacity"], [style*="filter"]',
        );
        elements.forEach((el) => {
          // Skip chrome subtree — workspace bar uses transforms legitimately.
          if (el.closest("[data-mr-chrome]")) return;
          el.style.removeProperty("transform");
          el.style.removeProperty("opacity");
          el.style.removeProperty("filter");
          el.style.removeProperty("translate");
          el.style.removeProperty("rotate");
          el.style.removeProperty("scale");
        });
      }, 100);
    }

    return () => {
      teardownLenis?.();
      mm.kill();
      if (wireframeHeartbeatId !== null) window.clearInterval(wireframeHeartbeatId);
    };
  }, []);

  return <>{children}</>;
}
