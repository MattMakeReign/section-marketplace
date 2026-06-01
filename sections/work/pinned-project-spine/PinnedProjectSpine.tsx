"use client";

/**
 * PinnedProjectSpine — pinned horizontal scrub project index.
 *
 * Adapted from the madewithgsap.com mwg_038 reference.
 *
 * Mechanics:
 *   - Outer wrapper reserves `pinLengthVh` of vertical space. ScrollTrigger
 *     pins the inner row (100vh tall, width: max-content) and scrubs it
 *     horizontally by exactly its overflow distance.
 *   - On every scroll update, the closest project index = round(progress *
 *     (N - 1)). State swap → exactly one project carries the `on` class →
 *     CSS reveals that project's image AND its width grows from the spine
 *     `inactiveWidthVw` to the image-driven natural width.
 *   - Inactive projects show only the rotated label spine (faded). Active
 *     project shows full opacity label + image at full size.
 *
 * Desktop only: on ≤ 768px the layout falls back to a vertical stack of
 * all projects fully expanded (no scrub, no pin) — handled in a media query
 * and a matchMedia guard around the GSAP setup.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SECTION_ID = "pinned-project-spine";

export type SpineProject = {
  id: string;
  label: string;
  year: string;
  media: { src: string; filename?: string };
  alt?: string;
};

export type PinnedProjectSpineProps = {
  items?: SpineProject[];
  background?: "dark" | "light";
  /** Section vertical span (vh). Higher = longer scrub. */
  pinLengthVh?: number;
  /** Width of an inactive project's spine column (vw). */
  inactiveWidthVw?: number;
  /** Vertical label font size (vw). */
  labelFontSizeVw?: number;
  /** Vertical label line-height + the gap above/below the image (vw). */
  labelLineHeightVw?: number;
  /** Image left margin from the spine label (vw). */
  imageMarginLeftVw?: number;
  /** Image right margin (vw). */
  imageMarginRightVw?: number;
  /** Image corner radius (vw). */
  imageRadiusVw?: number;
  /** Opacity of the divider between project spines (0..1). */
  dividerOpacity?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<PinnedProjectSpineProps>;

export const DEFAULT_ITEMS: SpineProject[] = D.items;

export function PinnedProjectSpine({
  items = D.items,
  background = D.background,
  pinLengthVh = D.pinLengthVh,
  inactiveWidthVw = D.inactiveWidthVw,
  labelFontSizeVw = D.labelFontSizeVw,
  labelLineHeightVw = D.labelLineHeightVw,
  imageMarginLeftVw = D.imageMarginLeftVw,
  imageMarginRightVw = D.imageMarginRightVw,
  imageRadiusVw = D.imageRadiusVw,
  dividerOpacity = D.dividerOpacity,
}: PinnedProjectSpineProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const pinHeightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The active project index — updated on every scroll tick. Stored in state
  // so React re-renders to swap which .project carries the `on` class.
  const [activeIndex, setActiveIndex] = useState(0);
  // Keep a ref synced for the rAF onUpdate so we don't depend on stale state.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    const root = rootRef.current;
    const pinHeight = pinHeightRef.current;
    const container = containerRef.current;
    if (!root || !pinHeight || !container) return;

    let alive = true;
    const mm = gsap.matchMedia();
    // Hold cleanup of the matchMedia-scoped tween + trigger so unmount kills it.
    const triggers: ScrollTrigger[] = [];
    let scrollTween: gsap.core.Tween | undefined;

    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img.pps-media"));
    const allLoaded = Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );

    allLoaded.then(() => {
      if (!alive) return;

      mm.add("(min-width: 769px)", () => {
        const numProjects = items.length;
        if (numProjects === 0) return;

        const dist = container.clientWidth - document.body.clientWidth;
        if (dist <= 0) return;

        scrollTween = gsap.to(container, {
          x: -dist,
          ease: "none",
          scrollTrigger: {
            trigger: pinHeight,
            pin: container,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => {
              const closestIndex = Math.round(self.progress * (numProjects - 1));
              if (closestIndex !== activeIndexRef.current) {
                activeIndexRef.current = closestIndex;
                setActiveIndex(closestIndex);
              }
            },
          },
        });
        if (scrollTween.scrollTrigger) triggers.push(scrollTween.scrollTrigger);

        ScrollTrigger.refresh();

        // Cleanup for this media-query branch.
        return () => {
          scrollTween?.kill();
          triggers.forEach((t) => t.kill());
          // Reset the container's gsap-set transform.
          gsap.set(container, { clearProps: "transform" });
        };
      });
    });

    return () => {
      alive = false;
      mm.kill();
      scrollTween?.kill();
      triggers.forEach((t) => t.kill());
    };
  }, [items.length, pinLengthVh, inactiveWidthVw, labelFontSizeVw, labelLineHeightVw, imageMarginLeftVw, imageMarginRightVw, imageRadiusVw]);

  const sectionStyle: React.CSSProperties = {
    background: background === "dark" ? "var(--surface, #121212)" : "var(--surface-inverse, #fdfcfc)",
    color: background === "dark" ? "#F1F1F1" : "#0A0A0B",
  };

  // CSS custom-property bag drives all the responsive vw-based dimensions.
  // Keeps the per-element inline-style noise low and lets the media query
  // override cleanly on mobile.
  const cssVars = {
    ["--pps-inactive-w" as string]: `${inactiveWidthVw}vw`,
    ["--pps-label-fs" as string]: `${labelFontSizeVw}vw`,
    ["--pps-label-lh" as string]: `${labelLineHeightVw}vw`,
    ["--pps-img-ml" as string]: `${imageMarginLeftVw}vw`,
    // Top margin is derived from labelLineHeight so the image stays vertically
    // centered regardless of what the designer sets for Line. The label spine
    // sits absolutely at bottom:0, so reserving half the line-height as top
    // padding produces equal whitespace above and below the image.
    ["--pps-img-mt" as string]: `calc(var(--pps-label-lh) / 2)`,
    ["--pps-img-mr" as string]: `${imageMarginRightVw}vw`,
    ["--pps-img-r" as string]: `${imageRadiusVw}vw`,
    ["--pps-divider" as string]: `rgba(255, 255, 255, ${dividerOpacity})`,
    ["--pps-divider-light" as string]: `rgba(0, 0, 0, ${dividerOpacity})`,
  } as React.CSSProperties;

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="pps-root w-full"
      style={{ ...sectionStyle, ...cssVars }}
    >
      <div
        ref={pinHeightRef}
        className="pps-pin-height relative"
        style={{ height: `${pinLengthVh}vh`, overflow: "hidden" }}
      >
        <div
          ref={containerRef}
          className="pps-container flex"
          style={{
            width: "max-content",
            height: "100vh",
            whiteSpace: "nowrap",
          }}
        >
          {items.map((it, i) => {
            const isActive = i === activeIndex;
            const isLast = i === items.length - 1;
            return (
              <div
                key={it.id}
                className={`pps-project relative h-full ${isActive ? "is-on" : "is-off"}`}
                data-pps-active={isActive ? "" : undefined}
                style={{
                  minWidth: "var(--pps-inactive-w)",
                  borderRight: isLast
                    ? undefined
                    : `1px solid ${background === "dark" ? "var(--pps-divider)" : "var(--pps-divider-light)"}`,
                }}
              >
                <div className="pps-datas flex justify-between">
                  <p className="pps-label">{it.label}</p>
                  <p className="pps-year">{it.year}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.media.src}
                  alt={it.alt ?? it.label}
                  className="pps-media"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .pps-root .pps-project.is-off { color: ${background === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)"}; }
        .pps-root .pps-project.is-on { color: inherit; }
        .pps-root .pps-project.is-off .pps-year,
        .pps-root .pps-project.is-off .pps-media { display: none; }
        .pps-root .pps-datas {
          position: absolute;
          bottom: 0;
          left: 2vw;
          font: 500 normal var(--pps-label-fs) / var(--pps-label-lh) 'Inter', ui-sans-serif, system-ui, sans-serif;
          letter-spacing: -0.03em;
          transform: rotate(-90deg);
          transform-origin: 0 50%;
          width: calc(100vh - var(--pps-label-lh));
        }
        .pps-root .pps-media {
          height: calc(100% - var(--pps-label-lh));
          width: auto;
          margin: var(--pps-img-mt) var(--pps-img-mr) 0 var(--pps-img-ml);
          object-fit: cover;
          border-radius: var(--pps-img-r);
        }
        @media (max-width: 768px) {
          .pps-root .pps-pin-height { height: auto !important; overflow: visible !important; }
          .pps-root .pps-container { height: auto !important; white-space: initial !important; width: 100% !important; flex-direction: column !important; transform: none !important; }
          .pps-root .pps-project { border-right: 0 !important; height: auto !important; min-width: 0 !important; }
          .pps-root .pps-project:not(:first-child) { border-top: 1px solid ${background === "dark" ? "var(--pps-divider)" : "var(--pps-divider-light)"}; }
          .pps-root .pps-project.is-off { color: inherit !important; }
          .pps-root .pps-datas {
            position: relative !important;
            transform: none !important;
            left: auto !important;
            margin: 30px 15px 15px !important;
            font-size: 28px !important;
            line-height: 30px !important;
            width: auto !important;
            display: block !important;
          }
          .pps-root .pps-media {
            display: block !important;
            margin: 15px !important;
            width: calc(100% - 30px) !important;
            height: auto !important;
            aspect-ratio: 1.8 !important;
          }
          .pps-root .pps-year { display: block !important; }
        }
      `}</style>
    </section>
  );
}
