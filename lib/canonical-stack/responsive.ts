/*
 * responsive.ts — breakpoints, media queries, fluid sizing.
 *
 * Mirrors --breakpoint-* tokens from each project's design-system/tokens.css.
 * Safe to import from server or client components.
 */

/** Breakpoint values in pixels. Mirrors --breakpoint-* tokens. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Build a min-width media query string for a named breakpoint. */
export function media(bp: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[bp]}px)`;
}

/** Build a max-width media query string (inclusive of the breakpoint - 1px). */
export function mediaDown(bp: Breakpoint): string {
  return `(max-width: ${BREAKPOINTS[bp] - 1}px)`;
}

/**
 * CSS clamp() expression for fluid typography or spacing.
 * Linearly scales `minPx` at `minVw` to `maxPx` at `maxVw`.
 *
 * Example:
 *   fontSize: fluid(16, 24)         // 16px on small screens, 24px on xl
 *   fontSize: fluid(20, 48, 768, 1280)
 */
export function fluid(
  minPx: number,
  maxPx: number,
  minVw: number = BREAKPOINTS.sm,
  maxVw: number = BREAKPOINTS.xl,
): string {
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const yIntercept = minPx - slope * minVw;
  const preferredVw = (slope * 100).toFixed(4);
  const preferredRem = (yIntercept / 16).toFixed(4);
  return `clamp(${minPx}px, ${preferredRem}rem + ${preferredVw}vw, ${maxPx}px)`;
}

/** Match a breakpoint at runtime. Client-only — returns false on the server. */
export function matchBreakpoint(bp: Breakpoint): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(media(bp)).matches;
}
