/*
 * wireframe.ts — render-mode mechanism for the canonical stack.
 *
 * Two modes today: "design" (the real project) and "wireframe" (greyscale +
 * neutral sans + no motion, for client structure review). Extensible — add a
 * new mode here, add its CSS layer in `styles.css`, expose it in the chrome
 * mode tray.
 *
 * Persisted via localStorage so toggles survive reloads. Read synchronously
 * by the no-flash init script (see `wireframeInitScript()` below) BEFORE
 * React mounts, so the `data-mr-render` attribute is set on `<html>` before
 * the first paint.
 *
 * Motion helpers in `motion.ts` read `isWireframeMode()` and skip reveal/
 * scrollIn animations when wireframe is on — sections render in their natural
 * state immediately, no invisible content from unfinished `gsap.from()`s.
 */

export type RenderMode = "design" | "wireframe";

const STORAGE_KEY = "mr-render-mode";
const ATTR = "data-mr-render";

const VALID_MODES: ReadonlyArray<RenderMode> = ["design", "wireframe"];

function isValidMode(v: unknown): v is RenderMode {
  return typeof v === "string" && (VALID_MODES as readonly string[]).includes(v);
}

/** Read the current render mode. Falls back to "design". */
export function getRenderMode(): RenderMode {
  if (typeof document === "undefined") return "design";
  const attr = document.documentElement.getAttribute(ATTR);
  return isValidMode(attr) ? attr : "design";
}

/** True if we're in wireframe mode right now. */
export function isWireframeMode(): boolean {
  return getRenderMode() === "wireframe";
}

/**
 * Set the render mode. Writes to localStorage, flips the html attribute,
 * notifies subscribers. Designer's two-button tray calls this.
 *
 * The CSS layer in styles.css does the visual swap. Motion helpers honour
 * the new mode on their next call — but components that have already mounted
 * their GSAP timelines won't snap retroactively. For a clean visual reset
 * the toggle should reload after a short delay (see `setRenderModeAndReload`).
 */
export function setRenderMode(mode: RenderMode): void {
  if (typeof document === "undefined") return;
  if (!isValidMode(mode)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* Storage may be unavailable (private mode, embed). Continue. */
  }
  document.documentElement.setAttribute(ATTR, mode);
  notify(mode);
}

/**
 * Toggle + reload. Use this from the chrome tray when the designer flips
 * modes — sections instantiate ScrollTriggers in useEffect once, so a clean
 * reset of the motion state requires a reload. The no-flash init script
 * (see below) means the new mode paints immediately on the next load.
 */
export function setRenderModeAndReload(mode: RenderMode): void {
  setRenderMode(mode);
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

const listeners = new Set<(mode: RenderMode) => void>();

function notify(mode: RenderMode) {
  for (const fn of listeners) {
    try {
      fn(mode);
    } catch {
      /* swallow listener errors; one bad subscriber shouldn't break others */
    }
  }
}

/** Subscribe to mode changes. Returns an unsubscribe fn. */
export function subscribeRenderMode(fn: (mode: RenderMode) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Inline JS that patches `window.matchMedia` so any query for
 * `prefers-reduced-motion: reduce` returns `{ matches: true }`. Sections
 * that respect this web-standard convention (canonical-stack's recommended
 * pattern) auto-pause their motion loops — even raw `requestAnimationFrame`
 * loops that bypass GSAP.
 *
 * Must run BEFORE any React component's useEffect — so this is meant to be
 * injected as an inline `<script>` in the document `<head>`, alongside the
 * data-attribute setup. Patching here (not via the JS API) is essential
 * because matchMedia is read at MODULE-LOAD time by some libraries.
 *
 * Returned as a code string for use with `dangerouslySetInnerHTML`.
 */
export function reducedMotionPatchScript(): string {
  return `(function(){try{var orig=window.matchMedia.bind(window);window.matchMedia=function(q){var r=orig(q);if(typeof q==="string"&&q.indexOf("prefers-reduced-motion")!==-1){return new Proxy(r,{get:function(t,p){if(p==="matches")return true;if(p==="media")return q;var v=t[p];return typeof v==="function"?v.bind(t):v;}});}return r;};}catch(e){}})();`;
}

/**
 * The no-flash init script for the designer's workspace session. Inject
 * into `<head>` BEFORE React mounts.
 *
 * Two things, synchronously, before first paint:
 *
 *   1. Reads `mr-render-mode` from localStorage and sets `data-mr-render`
 *      on `<html>`. The wireframe CSS layer applies before any content
 *      paints — no flash.
 *
 *   2. If localStorage says wireframe, installs `reducedMotionPatchScript`
 *      inline (matchMedia patch).
 *
 * For preview routes (client-share URLs) the mode comes from the URL via
 * middleware, not localStorage. Those routes call `reducedMotionPatchScript()`
 * directly when the locked mode is wireframe and skip this init script.
 */
export function wireframeInitScript(): string {
  return `(function(){try{var m=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(m==="wireframe"||m==="design"){document.documentElement.setAttribute(${JSON.stringify(ATTR)},m);}if(m==="wireframe"){var orig=window.matchMedia.bind(window);window.matchMedia=function(q){var r=orig(q);if(typeof q==="string"&&q.indexOf("prefers-reduced-motion")!==-1){return new Proxy(r,{get:function(t,p){if(p==="matches")return true;if(p==="media")return q;var v=t[p];return typeof v==="function"?v.bind(t):v;}});}return r;};}}catch(e){}})();`;
}
