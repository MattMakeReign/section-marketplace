"use client";

/**
 * SphereRotate — 3D Fibonacci-spiral sphere of images.
 *
 * Adapted from the madewithgsap.com mwg_099 reference. Layout / structure /
 * interaction logic only — all CDN refs, hardcoded sizes, and the global
 * overflow-hijack hack have been stripped. The section is bounded to its own
 * height; page scroll above/below works normally.
 *
 * Interaction model:
 *   - DRAG (pointer/touch) always rotates the sphere — primary interaction.
 *   - WHEEL is opt-in (default off). When enabled the section captures wheel
 *     events while the cursor is inside it; page scroll resumes outside.
 *
 * Math:
 *   - Fibonacci spiral places N points evenly on a unit sphere via the golden
 *     angle (φ = π·(3−√5)).
 *   - A 3×3 row-major rotation matrix accumulates incremental rotation about
 *     the SCREEN axes (left-multiplication), so drags always feel like the
 *     ball is rotating under your finger regardless of accumulated state.
 *   - gsap.quickTo eases the input deltas (drag/wheel) toward a settled
 *     value, producing the inertia feel without writing a manual rAF loop.
 */

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Observer);
}

const SECTION_ID = "sphere-rotate";

export type SphereItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type SphereRotateProps = {
  items?: SphereItem[];
  /** Section viewport height (vh). */
  heightVh?: number;
  /** Page background — dark or light. */
  background?: "dark" | "light";
  /** Tile size as % of viewport width (desktop). */
  imageSizeVw?: number;
  /** Tile size as % of viewport width (≤ 768px). */
  imageSizeVwMobile?: number;
  /** Tile corner radius in px. */
  imageRadiusPx?: number;
  /** Sphere radius as fraction of viewport width (desktop). */
  sphereRadiusFactor?: number;
  /** Sphere radius as fraction of viewport width (≤ 768px). */
  sphereRadiusFactorMobile?: number;
  /** CSS perspective as vw (desktop). */
  perspectiveVw?: number;
  /** CSS perspective as vw (≤ 768px). */
  perspectiveVwMobile?: number;
  /** Drag inertia duration in seconds (gsap.quickTo duration). */
  inertiaSeconds?: number;
  /** Lower = more sensitive drag (pointer divisor, desktop). */
  dragSensitivity?: number;
  /** Whether wheel input rotates the sphere (locks page scroll on this section while active). */
  wheelEnabled?: boolean;
  /** Lower = more sensitive wheel (divisor on deltaY/deltaX). */
  wheelSensitivity?: number;
  /** Gentle idle auto-rotation when no input is happening. */
  autoSpin?: boolean;
  /** Degrees per second of idle rotation (on the Y screen-axis). */
  autoSpinSpeed?: number;
  /** Position passed by SectionsContainer. */
  position?: number;
};

// Section defaults live in sample.json (designer-saved via the editor's
// Save button). Importing it here means every render path of this section
// gets the saved state by default.
import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<SphereRotateProps>;

export const DEFAULT_ITEMS: SphereItem[] = D.items;

export function SphereRotate({
  items = D.items,
  heightVh = D.heightVh,
  background = D.background,
  imageSizeVw = D.imageSizeVw,
  imageSizeVwMobile = D.imageSizeVwMobile,
  imageRadiusPx = D.imageRadiusPx,
  sphereRadiusFactor = D.sphereRadiusFactor,
  sphereRadiusFactorMobile = D.sphereRadiusFactorMobile,
  perspectiveVw = D.perspectiveVw,
  perspectiveVwMobile = D.perspectiveVwMobile,
  inertiaSeconds = D.inertiaSeconds,
  dragSensitivity = D.dragSensitivity,
  wheelEnabled = D.wheelEnabled,
  wheelSensitivity = D.wheelSensitivity,
  autoSpin = D.autoSpin,
  autoSpinSpeed = D.autoSpinSpeed,
}: SphereRotateProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable refs to current values so the rAF / observer don't tear down on
  // every prop change. Only the items list, wheel toggle, and inertia
  // duration force a full re-init via the effect's dep array.
  const cfgRef = useRef({
    sphereRadiusFactor,
    sphereRadiusFactorMobile,
    perspectiveVw,
    perspectiveVwMobile,
    dragSensitivity,
    wheelSensitivity,
    autoSpin,
    autoSpinSpeed,
  });
  cfgRef.current = {
    sphereRadiusFactor,
    sphereRadiusFactorMobile,
    perspectiveVw,
    perspectiveVwMobile,
    dragSensitivity,
    wheelSensitivity,
    autoSpin,
    autoSpinSpeed,
  };

  const totalMedias = items.length;

  // Fibonacci-spiral seed positions for the current item count. Recomputes
  // only when the item count changes.
  const positions = useMemo(() => {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const out: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < totalMedias; i++) {
      const y = 1 - (2 * i) / (totalMedias - 1 || 1);
      const phi = Math.acos(y) - Math.PI / 2;
      const theta = (i * goldenAngle) % (2 * Math.PI);
      out.push({
        x: Math.cos(phi) * Math.cos(theta),
        y: Math.sin(phi),
        z: Math.cos(phi) * Math.sin(theta),
      });
    }
    return out;
  }, [totalMedias]);

  useEffect(() => {
    const root = rootRef.current;
    const sphere = sphereRef.current;
    const container = containerRef.current;
    if (!root || !sphere || !container) return;

    const medias = Array.from(sphere.querySelectorAll<HTMLImageElement>("img.sphere-media"));
    if (medias.length === 0) return;

    const sphereEl = sphere;
    const containerEl = container;
    let radius = 0;
    let lastPersp = -1;
    function isMobile() {
      return window.innerWidth <= 768;
    }
    function syncFromConfig() {
      const cfg = cfgRef.current;
      radius = (isMobile() ? cfg.sphereRadiusFactorMobile : cfg.sphereRadiusFactor) * window.innerWidth;
      const persp = isMobile() ? cfg.perspectiveVwMobile : cfg.perspectiveVw;
      if (persp !== lastPersp) {
        containerEl.style.perspective = `${persp}vw`;
        lastPersp = persp;
      }
    }
    syncFromConfig();

    // Safari 3D bug — preserve-3d must be set explicitly via gsap.set.
    gsap.set(sphereEl, { transformStyle: "preserve-3d" });

    // Row-major 3×3 rotation matrix (identity).
    const m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const mTmp = new Array<number>(9).fill(0);
    const R = new Array<number>(9).fill(0);

    function premultiply3x3(left: number[]) {
      for (let i = 0; i < 3; i++) {
        const a = left[i * 3];
        const b = left[i * 3 + 1];
        const c = left[i * 3 + 2];
        for (let j = 0; j < 3; j++) {
          mTmp[i * 3 + j] = a * m[j] + b * m[3 + j] + c * m[6 + j];
        }
      }
      for (let k = 0; k < 9; k++) m[k] = mTmp[k];
    }

    const smooth = { x: 0, y: 0 };
    let prevX = 0;
    let prevY = 0;

    function applyMatrix() {
      for (let i = 0; i < medias.length; i++) {
        const p = positions[i];
        if (!p) continue;
        const x = m[0] * p.x + m[1] * p.y + m[2] * p.z;
        const y = m[3] * p.x + m[4] * p.y + m[5] * p.z;
        const z = m[6] * p.x + m[7] * p.y + m[8] * p.z;
        medias[i].style.transform = `translate3d(${x * radius}px, ${-y * radius}px, ${z * radius}px)`;
      }
    }

    function updateMedias() {
      const dY = ((smooth.y - prevY) * Math.PI) / 180;
      const dX = ((smooth.x - prevX) * Math.PI) / 180;
      prevY = smooth.y;
      prevX = smooth.x;

      if (dX !== 0 || dY !== 0) {
        const cy = Math.cos(dY);
        const sy = Math.sin(dY);
        const cx = Math.cos(dX);
        const sx = Math.sin(dX);
        R[0] = cy;        R[1] = 0;  R[2] = sy;
        R[3] = sx * sy;   R[4] = cx; R[5] = -sx * cy;
        R[6] = -cx * sy;  R[7] = sx; R[8] = cx * cy;
        premultiply3x3(R);
      }
      applyMatrix();
    }
    applyMatrix();

    const quickY = gsap.quickTo(smooth, "y", {
      duration: inertiaSeconds,
      ease: "power2",
      onUpdate: updateMedias,
    });
    const quickX = gsap.quickTo(smooth, "x", {
      duration: inertiaSeconds,
      ease: "power2",
      onUpdate: updateMedias,
    });

    let isTouch = false;
    const mm = gsap.matchMedia();
    mm.add("(hover: none)", () => {
      isTouch = true;
    });

    let incrY = 0;
    let incrX = 0;

    const obs = Observer.create({
      target: root,
      type: wheelEnabled ? "wheel,touch,pointer" : "touch,pointer",
      // Wheel mode locks page scroll while wheeling inside the section. Drag
      // mode doesn't need preventDefault — pointer drag never triggers scroll.
      preventDefault: wheelEnabled,
      onWheel: (e) => {
        if (!wheelEnabled) return;
        const sens = cfgRef.current.wheelSensitivity;
        incrY -= e.deltaY / sens;
        incrX -= e.deltaX / sens;
        quickY(incrX);
        quickX(incrY);
      },
      onDrag: (e) => {
        const sens = cfgRef.current.dragSensitivity;
        incrY += isTouch ? e.deltaY : e.deltaY / sens;
        incrX += isTouch ? e.deltaX : e.deltaX / sens;
        quickY(incrX);
        quickX(incrY);
      },
    });

    // Per-frame loop:
    //   1. Sync sphere radius + perspective from cfgRef (so the Sphere /
    //      Depth sliders feel live without re-initialising the effect).
    //   2. Apply optional auto-spin when no drag is in progress.
    // applyMatrix() is repainted via the quickTo onUpdate when smooth.x/y
    // moves; we ALSO re-call it from here whenever radius changes so the
    // Sphere slider repositions tiles even if no input is happening.
    let spinRaf = 0;
    let lastTs = 0;
    let lastRadius = radius;
    // Hard cap on per-frame dt. Without this, returning to the tab after a
    // long absence produces a giant `ts - lastTs` (rAF pauses while hidden),
    // which dumps a huge increment into `incrX` and the sphere then has to
    // "catch up" via quickTo — visible as a fast spin that unwinds.
    // 100ms cap = at most ~1/10s worth of auto-spin per frame, regardless
    // of how long the tab was backgrounded.
    const MAX_DT = 0.1;
    function frame(ts: number) {
      syncFromConfig();
      if (radius !== lastRadius) {
        applyMatrix();
        lastRadius = radius;
      }
      if (cfgRef.current.autoSpin && !obs.isDragging) {
        if (!lastTs) lastTs = ts;
        let dt = (ts - lastTs) / 1000;
        if (dt > MAX_DT) dt = 0; // bail any catch-up window entirely
        lastTs = ts;
        // Horizontal turntable spin = rotation about the screen Y axis.
        // quickY reads incrX (mirror of the wheel/drag wiring).
        incrX += cfgRef.current.autoSpinSpeed * dt;
        quickY(incrX);
      } else {
        lastTs = ts;
      }
      spinRaf = requestAnimationFrame(frame);
    }
    spinRaf = requestAnimationFrame(frame);

    function onResize() {
      syncFromConfig();
      applyMatrix();
    }
    window.addEventListener("resize", onResize);

    // Reset the dt baseline whenever the tab regains visibility, so the
    // first post-return frame doesn't even reach the MAX_DT clamp. Belt
    // and braces with the cap above.
    function onVisibility() {
      if (!document.hidden) lastTs = 0;
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(spinRaf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      obs.kill();
      mm.kill();
    };
    // wheelEnabled & inertiaSeconds force a full re-init because they change
    // Observer wiring / quickTo duration respectively. positions also forces
    // re-init when the item list resizes.
  }, [wheelEnabled, inertiaSeconds, positions]);

  const sizeStyle = {
    // CSS custom properties consumed by the per-image sizing rules below.
    ["--sphere-media-size" as string]: `${imageSizeVw}vw`,
    ["--sphere-media-size-mobile" as string]: `${imageSizeVwMobile}vw`,
    ["--sphere-media-radius" as string]: `${imageRadiusPx}px`,
  } as React.CSSProperties;

  const sectionStyle: React.CSSProperties = {
    height: `${heightVh}vh`,
    background:
      background === "dark"
        ? "var(--surface, #121212)"
        : "var(--surface-inverse, #fdfcfc)",
    ...sizeStyle,
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      data-lenis-prevent={wheelEnabled ? "" : undefined}
      className="sphere-rotate-root relative w-full overflow-hidden flex items-center justify-center select-none touch-none"
      style={sectionStyle}
    >
      <div
        ref={containerRef}
        className="sphere-rotate-container w-full h-full flex items-center justify-center"
        style={{ perspectiveOrigin: "center center" }}
      >
        <div ref={sphereRef} className="sphere-rotate-sphere relative w-full h-full">
          {items.map((it, i) => {
            // Emit the IDENTITY-matrix transform inline so first paint already
            // shows the sphere. Without this, every img lands at the same
            // center point (CSS only) and the user sees one stacked thumbnail
            // for ~1 frame before useEffect runs applyMatrix().
            //
            // Uses vw units so SSR + first paint don't need JS / window. The
            // useEffect immediately overwrites with px-based transforms once
            // it has actual measurements; values match because both compute
            // `radius = sphereRadiusFactor * window.innerWidth`.
            const p = positions[i];
            const factor = sphereRadiusFactor * 100; // vw units
            const initialTransform = p
              ? `translate3d(${(p.x * factor).toFixed(3)}vw, ${(-p.y * factor).toFixed(3)}vw, ${(p.z * factor).toFixed(3)}vw)`
              : undefined;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={it.id}
                src={it.src}
                alt={it.alt ?? ""}
                className="sphere-media"
                draggable={false}
                style={initialTransform ? { transform: initialTransform } : undefined}
              />
            );
          })}
        </div>
      </div>

      <style>{`
        .sphere-rotate-root .sphere-media {
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--sphere-media-size);
          height: var(--sphere-media-size);
          margin-left: calc(var(--sphere-media-size) / -2);
          margin-top: calc(var(--sphere-media-size) / -2);
          object-fit: cover;
          border-radius: var(--sphere-media-radius);
          transform-style: preserve-3d;
          user-select: none;
          -webkit-user-drag: none;
          will-change: transform;
        }
        @media (max-width: 768px) {
          .sphere-rotate-root .sphere-media {
            width: var(--sphere-media-size-mobile);
            height: var(--sphere-media-size-mobile);
            margin-left: calc(var(--sphere-media-size-mobile) / -2);
            margin-top: calc(var(--sphere-media-size-mobile) / -2);
          }
        }
      `}</style>
    </section>
  );
}
