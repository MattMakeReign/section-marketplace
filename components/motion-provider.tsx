"use client";

import { useEffect } from "react";
import { installMotion, createMatchMedia } from "@/design-system/motion";
import { installSmoothScroll } from "@/design-system/smooth-scroll";

/**
 * MotionProvider — installs the canonical motion runtime once on mount:
 *   - GSAP defaults + plugin registration (ScrollTrigger)
 *   - gsap.matchMedia() container (responsive + reduced-motion)
 *   - Lenis smooth-scroll singleton, wired to GSAP's ticker + ScrollTrigger
 *
 * Mount once at the root of the app. Sections never instantiate motion or
 * smooth-scroll themselves — they consume what this provider sets up.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installMotion();
    const mm = createMatchMedia();
    const teardownLenis = installSmoothScroll();
    return () => {
      teardownLenis();
      mm.kill();
    };
  }, []);

  return <>{children}</>;
}
