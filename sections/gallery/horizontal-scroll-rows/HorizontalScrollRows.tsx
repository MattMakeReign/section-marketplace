"use client";

/**
 * HorizontalScrollRows — pinned multi-row horizontal scrub.
 *
 * Adapted from the madewithgsap.com mwg_065 reference. The section is taller
 * than the viewport; ScrollTrigger pins an inner container while the user
 * scrolls through the full section length, and a scrubbed GSAP timeline
 * slides each row horizontally by its own overflow distance. Wider rows
 * scrub faster (they have more pixels to travel in the same scroll span).
 *
 * Layout:
 *   <section>            — relative wrapper, height = pinLengthVh (e.g. 400vh)
 *     <div pin-target>   — height: 100vh, pinned to viewport while section
 *                          is in view, contains the rows
 *       <div row>        — flex row, width: max-content, slides horizontally
 *         <img/>...
 *       </div>
 *       ...
 *     </div>
 *   </section>
 *
 * Implementation notes:
 *   - Wait for ALL images to load before measuring row.scrollWidth — image
 *     dimensions drive row width, so triggers built before load are wrong.
 *   - ScrollTrigger rebuilds when structural props change (rows, direction,
 *     pinLengthVh, tileGapPx, rowGapPx, imageRadiusPx, items.length). Lenis
 *     smooth-scroll integration is handled by the canonical-stack
 *     MotionProvider higher up — no per-section Lenis wiring needed.
 *   - Items are auto-distributed across rows round-robin. Designers control
 *     which row owns which image by reordering in MediaManager.
 */

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SECTION_ID = "horizontal-scroll-rows";

export type ScrollRowItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type RowDirection = "left" | "right" | "alternating";

export type HorizontalScrollRowsProps = {
  items?: ScrollRowItem[];
  /** Number of rows. Items distribute round-robin across rows. */
  rows?: 2 | 3 | 4;
  /** Section vertical length, in viewport heights. The bigger this is, the
   *  longer the pinned scrub lasts. 400 means 4 viewport heights of scroll. */
  pinLengthVh?: number;
  /** Section tone. */
  background?: "dark" | "light";
  /** Gap between images within a row, in px. */
  tileGapPx?: number;
  /** Gap between rows, in px. */
  rowGapPx?: number;
  /** Image corner radius, in px. */
  imageRadiusPx?: number;
  /** Padding inside the pinned container left/right, in px. */
  edgePaddingPx?: number;
  /** How rows scroll. "left" = all left (original); "right" = all right;
   *  "alternating" = row 1 left, row 2 right, row 3 left, etc. */
  direction?: RowDirection;
  /** Multiplier on each row's overflow distance. 1 = exact end-align;
   *  >1 = rows over-scroll past their natural end (more drama); <1 = rows
   *  don't fully reveal their end. */
  scrollBias?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

// Section defaults live in sample.json (designer-saved via the editor's
// Save button). Importing it here means every render path of this section
// gets the saved state by default.
import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<HorizontalScrollRowsProps>;

export const DEFAULT_ITEMS: ScrollRowItem[] = D.items;

export function HorizontalScrollRows({
  items = D.items,
  rows = D.rows,
  pinLengthVh = D.pinLengthVh,
  background = D.background,
  tileGapPx = D.tileGapPx,
  rowGapPx = D.rowGapPx,
  imageRadiusPx = D.imageRadiusPx,
  edgePaddingPx = D.edgePaddingPx,
  direction = D.direction,
  scrollBias = D.scrollBias,
}: HorizontalScrollRowsProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Split items into N rows round-robin. Round-robin distributes evenly +
  // varies adjacency, which makes the parallax feel less mechanical than a
  // chunk-split (where row 1 = first third, row 2 = middle third, etc.).
  const rowedItems = useMemo(() => {
    const out: ScrollRowItem[][] = Array.from({ length: rows }, () => []);
    items.forEach((it, i) => {
      out[i % rows].push(it);
    });
    return out;
  }, [items, rows]);

  useEffect(() => {
    const root = rootRef.current;
    const pinTarget = pinTargetRef.current;
    const container = containerRef.current;
    if (!root || !pinTarget || !container) return;

    const rowEls = Array.from(container.querySelectorAll<HTMLDivElement>(".hsr-row"));
    if (rowEls.length === 0) return;

    const images = Array.from(container.querySelectorAll<HTMLImageElement>("img.hsr-media"));

    let pinTrigger: ScrollTrigger | undefined;
    let scrubTrigger: ScrollTrigger | undefined;
    let timeline: gsap.core.Timeline | undefined;
    let alive = true;

    const allLoaded = Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );

    allLoaded.then(() => {
      if (!alive) return;

      // Pin the inner pin-target for the section's full vertical span.
      // Section already reserves pinLengthVh of own height; default
      // pinSpacing handles the spacing correctly when trigger and pin are
      // different elements (spacing absorbed inside trigger, not added after).
      pinTrigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        pin: pinTarget,
      });

      // Scrubbed timeline — all row tweens start at time 0 and move in parallel.
      timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });
      scrubTrigger = timeline.scrollTrigger;

      rowEls.forEach((row, index) => {
        const overflow = row.scrollWidth - container.clientWidth;
        if (overflow <= 0) return;

        const sign =
          direction === "right"
            ? 1
            : direction === "alternating"
              ? index % 2 === 0
                ? -1
                : 1
              : -1;

        const distance = overflow * scrollBias * sign;
        // Start position is opposite of travel direction so the row's leading
        // edge sits at the viewport edge at scroll = 0, and the trailing edge
        // sits at the opposite viewport edge at scroll = 1.
        if (sign === 1) {
          gsap.set(row, { x: -overflow * scrollBias });
        } else {
          gsap.set(row, { x: 0 });
        }
        timeline!.to(
          row,
          {
            x: sign === 1 ? 0 : distance,
            ease: "none",
            duration: 1,
          },
          0,
        );
      });

      // Force ScrollTrigger to recalc positions after the pin attaches +
      // initial x positions are set. Without this, scrub may read stale
      // scroll progress on first paint.
      ScrollTrigger.refresh();
    });

    return () => {
      alive = false;
      pinTrigger?.kill();
      scrubTrigger?.kill();
      timeline?.kill();
      // Reset row transforms so subsequent re-mounts don't inherit leftover
      // gsap.set values.
      rowEls.forEach((row) => gsap.set(row, { clearProps: "transform" }));
    };
  }, [
    rows,
    direction,
    pinLengthVh,
    tileGapPx,
    rowGapPx,
    imageRadiusPx,
    edgePaddingPx,
    scrollBias,
    items.length,
  ]);

  const sectionStyle: React.CSSProperties = {
    height: `${pinLengthVh}vh`,
    background:
      background === "dark"
        ? "var(--surface, #121212)"
        : "var(--surface-inverse, #fdfcfc)",
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="hsr-root relative w-full"
      style={sectionStyle}
    >
      <div
        ref={pinTargetRef}
        className="hsr-pin-target relative w-full overflow-hidden"
        style={{ height: "100vh" }}
      >
        <div
          ref={containerRef}
          className="hsr-container flex flex-col justify-center w-full h-full"
          style={{
            gap: `${rowGapPx}px`,
            // Container is full viewport height; each row gets an equal slice
            // minus the gaps between them. CSS calc keeps the math live.
            ["--hsr-row-h" as string]: `calc((100% - ${rowGapPx * (rows - 1)}px) / ${rows})`,
            paddingLeft: `${edgePaddingPx}px`,
            paddingRight: `${edgePaddingPx}px`,
          }}
        >
          {rowedItems.map((rowItems, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              className="hsr-row flex"
              style={{
                gap: `${tileGapPx}px`,
                height: "var(--hsr-row-h)",
                width: "max-content",
                willChange: "transform",
              }}
            >
              {rowItems.map((it) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={it.id}
                  src={it.src}
                  alt={it.alt ?? ""}
                  className="hsr-media"
                  draggable={false}
                  style={{
                    height: "100%",
                    width: "auto",
                    display: "block",
                    borderRadius: `${imageRadiusPx}px`,
                    /* Override Tailwind preflight (img max-width: 100%) so
                     * the natural-width image isn't clamped to container. */
                    maxWidth: "none",
                    userSelect: "none",
                    WebkitUserDrag: "none",
                  } as React.CSSProperties}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
