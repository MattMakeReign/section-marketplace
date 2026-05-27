"use client";

/**
 * CursorTrailSpray — hero with header strip + oversized italic title + mono
 * caption, with image tiles spawned along the cursor's trail.
 *
 * Adapted from the madewithgsap.com mwg_020 reference. Mouse-trail logic is
 * a TRAVEL-DISTANCE throttle, not a time interval: an internal accumulator
 * adds |Δx| + |Δy| on every mousemove, and only when it crosses the
 * `trailDistanceFactor * viewportWidth` threshold does it spawn a tile and
 * reset. So slow careful pans drop a few large gaps; fast wide sweeps drop
 * a dense stream.
 *
 * Tile animation is a 3-step gsap.timeline:
 *   1. fromTo scale 1.3 → 1 with elastic.out(2, 0.6) over `popInSeconds`
 *      (the rebound spring)
 *   2. fromTo position: starts at cursor + random offset, drifts by
 *      (deltaX, deltaY) × `driftMultiplier` over `driftSeconds` with
 *      power4.out (parallel with step 1 via "<" position param)
 *   3. to scale: shrinks to `finalScale` after `scaleOutDelay`, back.in
 *
 * Tiles use `object-fit: cover` so percentage border-radius rounds cleanly
 * regardless of source image aspect.
 */

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

const SECTION_ID = "cursor-trail-spray";

export type TrailItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type CursorTrailSprayProps = {
  /** Top-left brand mark. */
  headerLeft?: string;
  /** Second header item. */
  headerLeftMid?: string;
  /** Third header item. */
  headerRightMid?: string;
  /** Top-right action / link. */
  headerRight?: string;
  /** Oversized italic display title. */
  title?: string;
  /** Mono caption below the title. */
  caption?: string;
  /** Image pool. Spawned tiles cycle through this list in order. */
  items?: TrailItem[];

  /** Section viewport height (vh). */
  heightVh?: number;
  /** Surface tone. */
  background?: "dark" | "light";
  /** Inset for the header row (px on all sides). Reference: 25. */
  headerPaddingPx?: number;
  /** Title font size (vw). Reference: 9. */
  titleSizeVw?: number;
  /** Title block max width as % of section. Reference: 56. */
  titleWidthPct?: number;
  /** Caption font size (vw). Reference: 0.9. */
  captionSizeVw?: number;
  /** Caption block max width (vw). Reference: 34. */
  captionWidthVw?: number;
  /** Gap between title and caption (vw). Reference: 3. */
  gapBlockVw?: number;

  /** Spawned tile size (vw). Reference: 15. */
  imageSizeVw?: number;
  /** Tile corner radius as % of tile size. Reference: 4. */
  imageRadiusPct?: number;
  /** Cursor travel distance threshold for next spawn, as fraction of viewport
   *  width. Reference: 1/8 = 0.125 — every viewport-width/8 of accumulated
   *  travel triggers a spawn. */
  trailDistanceFactor?: number;
  /** Pop-in tween duration (s). Reference: 0.6. */
  popInSeconds?: number;
  /** Position drift tween duration (s). Reference: 1.5. */
  driftSeconds?: number;
  /** Scale-out tween duration (s). Reference: 0.3. */
  scaleOutSeconds?: number;
  /** Delay before scale-out starts (s). Reference: 0.1. */
  scaleOutDelay?: number;
  /** How far the tile drifts in the cursor direction (multiplier on deltaX/Y).
   *  Reference: 4. */
  driftMultiplier?: number;
  /** Random horizontal jitter on spawn (%). Reference: 80. */
  xJitterPct?: number;
  /** Random vertical jitter on spawn (%). Reference: 10. */
  yJitterPct?: number;
  /** Random tilt range (±deg). Reference: 20. */
  rotationDeg?: number;
  /** Scale at spawn (before elastic settle). Reference: 1.3. */
  initialScale?: number;
  /** Scale at end of scale-out. Reference: 0.5. */
  finalScale?: number;

  /** Injected by SectionsContainer. */
  position?: number;
};

// Section defaults live in sample.json (designer-saved via the editor's Save
// button). Importing it here means every render path of this section gets the
// saved state by default.
import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<CursorTrailSprayProps>;

export const DEFAULT_ITEMS: TrailItem[] = D.items;

export function CursorTrailSpray({
  headerLeft = D.headerLeft,
  headerLeftMid = D.headerLeftMid,
  headerRightMid = D.headerRightMid,
  headerRight = D.headerRight,
  title = D.title,
  caption = D.caption,
  items = D.items,
  heightVh = D.heightVh,
  background = D.background,
  headerPaddingPx = D.headerPaddingPx,
  titleSizeVw = D.titleSizeVw,
  titleWidthPct = D.titleWidthPct,
  captionSizeVw = D.captionSizeVw,
  captionWidthVw = D.captionWidthVw,
  gapBlockVw = D.gapBlockVw,
  imageSizeVw = D.imageSizeVw,
  imageRadiusPct = D.imageRadiusPct,
  trailDistanceFactor = D.trailDistanceFactor,
  popInSeconds = D.popInSeconds,
  driftSeconds = D.driftSeconds,
  scaleOutSeconds = D.scaleOutSeconds,
  scaleOutDelay = D.scaleOutDelay,
  driftMultiplier = D.driftMultiplier,
  xJitterPct = D.xJitterPct,
  yJitterPct = D.yJitterPct,
  rotationDeg = D.rotationDeg,
  initialScale = D.initialScale,
  finalScale = D.finalScale,
}: CursorTrailSprayProps = {}) {
  const rootRef = useRef<HTMLElement>(null);

  // Live config for the trail handler so designer slider drags affect new
  // spawns without rebinding listeners.
  const cfg = useMemo(
    () => ({
      items,
      imageSizeVw,
      imageRadiusPct,
      trailDistanceFactor,
      popInSeconds,
      driftSeconds,
      scaleOutSeconds,
      scaleOutDelay,
      driftMultiplier,
      xJitterPct,
      yJitterPct,
      rotationDeg,
      initialScale,
      finalScale,
    }),
    [
      items,
      imageSizeVw,
      imageRadiusPct,
      trailDistanceFactor,
      popInSeconds,
      driftSeconds,
      scaleOutSeconds,
      scaleOutDelay,
      driftMultiplier,
      xJitterPct,
      yJitterPct,
      rotationDeg,
      initialScale,
      finalScale,
    ],
  );
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let oldX = 0;
    let oldY = 0;
    let accumDist = 0;
    let indexImg = 0;
    let primed = false;

    function onMove(e: MouseEvent) {
      const c = cfgRef.current;
      const x = e.clientX;
      const y = e.clientY;

      // First move: just record position. Don't spawn anything (otherwise we
      // get a stray tile at the cursor's entry point with no real travel).
      if (!primed) {
        oldX = x;
        oldY = y;
        primed = true;
        return;
      }

      const dx = x - oldX;
      const dy = y - oldY;
      accumDist += Math.abs(dx) + Math.abs(dy);

      const threshold = c.trailDistanceFactor * window.innerWidth;
      if (accumDist > threshold) {
        accumDist = 0;
        if (c.items.length > 0) {
          const item = c.items[indexImg % c.items.length];
          // Coordinates are RELATIVE to the section root (which is the
          // absolute positioning context for spawned images).
          const rect = root!.getBoundingClientRect();
          spawn(item.src, x - rect.left, y - rect.top, dx, dy, c);
          indexImg++;
        }
      }

      oldX = x;
      oldY = y;
    }

    function spawn(
      src: string,
      x: number,
      y: number,
      dx: number,
      dy: number,
      c: typeof cfg,
    ) {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.className = "cts-spawn";
      image.style.width = `${c.imageSizeVw}vw`;
      image.style.height = `${c.imageSizeVw}vw`;
      image.style.objectFit = "cover";
      image.style.position = "absolute";
      image.style.top = "0";
      image.style.left = "0";
      image.style.pointerEvents = "none";
      image.style.maxWidth = "none";
      image.style.borderRadius = `${c.imageRadiusPct}%`;
      image.style.zIndex = "5";
      image.style.overflow = "hidden";
      root!.appendChild(image);

      const tl = gsap.timeline({
        onComplete: () => {
          if (image.parentNode === root) root!.removeChild(image);
          tl.kill();
        },
      });

      // 1) Elastic scale-in pop. Anchors xPercent/yPercent at -50 ± jitter
      //    so the spawned image is centred on the cursor with a little
      //    randomness.
      tl.fromTo(
        image,
        {
          xPercent: -50 + (Math.random() - 0.5) * c.xJitterPct,
          yPercent: -50 + (Math.random() - 0.5) * c.yJitterPct,
          scaleX: c.initialScale,
          scaleY: c.initialScale,
        },
        {
          scaleX: 1,
          scaleY: 1,
          ease: "elastic.out(2, 0.6)",
          duration: c.popInSeconds,
        },
      );

      // 2) Position drift in cursor direction, parallel with the pop ("<").
      tl.fromTo(
        image,
        {
          x,
          y,
          rotation: (Math.random() - 0.5) * c.rotationDeg,
        },
        {
          x: `+=${dx * c.driftMultiplier}`,
          y: `+=${dy * c.driftMultiplier}`,
          rotation: (Math.random() - 0.5) * c.rotationDeg,
          ease: "power4.out",
          duration: c.driftSeconds,
        },
        "<",
      );

      // 3) Scale-out exit (sequenced after the pop+drift).
      tl.to(image, {
        scale: c.finalScale,
        duration: c.scaleOutSeconds,
        delay: c.scaleOutDelay,
        ease: "back.in(1.5)",
      });
    }

    root.addEventListener("mousemove", onMove);

    return () => {
      root.removeEventListener("mousemove", onMove);
      // Sweep in-flight spawns so hot-reload / unmount doesn't leak nodes.
      root.querySelectorAll(".cts-spawn").forEach((n) => n.remove());
    };
  }, []);

  // On the default (dark) surface, `--fg` is the project's primary text
  // colour. When flipped to light, swap to the inverse pair.
  const sectionStyle: React.CSSProperties = {
    height: `${heightVh}vh`,
    background:
      background === "dark"
        ? "var(--surface, #121212)"
        : "var(--surface-inverse, #fdfcfc)",
    color:
      background === "dark"
        ? "var(--fg, #f5f5f5)"
        : "var(--fg-inverse, #0a0908)",
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="cts-root relative w-full overflow-hidden"
      style={sectionStyle}
    >
      {/* Header strip */}
      <div
        className="cts-header"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          padding: `${headerPaddingPx}px`,
          display: "flex",
          justifyContent: "space-between",
          // Header items use the DS H6/eyebrow style (uppercase, tracked) —
          // matches the project's small-label convention.
          fontSize: "var(--text-heading-6)",
          lineHeight: "var(--text-heading-6--line-height)",
          fontWeight: "var(--text-heading-6--font-weight)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          zIndex: 10,
        }}
      >
        <p>{headerLeft}</p>
        <p>{headerLeftMid}</p>
        <p>{headerRightMid}</p>
        <p>{headerRight}</p>
      </div>

      {/* Centre content stack */}
      <div
        className="cts-container"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: `${gapBlockVw}vw`,
          zIndex: 1,
        }}
      >
        <p
          className="cts-title"
          style={{
            textAlign: "center",
            textTransform: "uppercase",
            // Project's serif token for the italic display look; designers
            // can swap --font-serif at the project level to upgrade to a
            // dedicated face (Instrument Serif etc.).
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: `${titleSizeVw}vw`,
            lineHeight: 0.76,
            letterSpacing: "-0.05em",
            width: `${titleWidthPct}%`,
          }}
        >
          {title}
        </p>
        <p
          className="cts-caption"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: `clamp(12px, ${captionSizeVw}vw, 100px)`,
            fontWeight: 500,
            textTransform: "uppercase",
            maxWidth: `${captionWidthVw}vw`,
            textAlign: "center",
          }}
        >
          {caption}
        </p>
      </div>
    </section>
  );
}
