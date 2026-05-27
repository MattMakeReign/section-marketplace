"use client";

/**
 * CursorMagnetGrid — magnetic image grid that reacts to the cursor.
 *
 * Adapted from the madewithgsap.com mwg_095 reference. A grid of images sits
 * with random per-tile jitter (translate XY% + rotation). On `mousemove` the
 * closest tile to the cursor scales up to `activeScale` and settles at 0,0,0;
 * every other tile is pushed outward by an inverse-square force scaled by its
 * grid distance from the active cell. On `mouseleave` everything re-randomises
 * back to a relaxed jitter.
 *
 * Implementation notes:
 *   - Tile distance is measured by grid cell (row/col), not pixels. This makes
 *     the falloff feel architectural rather than pixel-bumpy: the closest ring
 *     fans out hardest, the next ring less, far corners barely move.
 *   - Orientation (portrait / landscape) is detected per image on `load` from
 *     naturalWidth/Height. Landscape: width: 100%, height: auto. Portrait:
 *     opposite. Tiles are square (aspect-ratio: 1) so this prevents stretch.
 *   - All transforms go through gsap.set / gsap.to — no React re-renders on
 *     pointer events. The component is mounted once; everything else is DOM.
 *   - We deliberately rebuild listeners + initial jitter on prop changes that
 *     affect the per-tile setup (items.length, columns, jitterPercent etc.).
 */

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

const SECTION_ID = "cursor-magnet-grid";

export type MagnetTileItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type CursorMagnetGridProps = {
  items?: MagnetTileItem[];
  /** Number of grid columns. Items wrap row-by-row. */
  columns?: 3 | 4 | 5 | 6;
  /** Section tone. */
  background?: "dark" | "light";
  /** Tile width in viewport-width units. Tiles are square (aspect-ratio: 1). */
  tileSizeVw?: number;
  /** Gap between tiles in px. */
  tileGapPx?: number;
  /** Image corner radius in px. */
  imageRadiusPx?: number;
  /** Resting scale for all tiles. Reference uses 1.1 so tiles slightly overlap. */
  baseScale?: number;
  /** Scale of the currently-magnetised tile. */
  activeScale?: number;
  /** Magnitude of the inverse-square push applied to neighbour tiles. */
  pushForce?: number;
  /** Random translate range (± xPercent / yPercent) applied to each tile at rest. */
  jitterPercent?: number;
  /** Random rotation range in degrees applied to each tile at rest. */
  jitterRotation?: number;
  /** Tween duration for both rest + active states, in seconds. */
  durationSec?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<CursorMagnetGridProps>;

export const DEFAULT_ITEMS: MagnetTileItem[] = D.items;

export function CursorMagnetGrid({
  items = D.items,
  columns = D.columns,
  background = D.background,
  tileSizeVw = D.tileSizeVw,
  tileGapPx = D.tileGapPx,
  imageRadiusPx = D.imageRadiusPx,
  baseScale = D.baseScale,
  activeScale = D.activeScale,
  pushForce = D.pushForce,
  jitterPercent = D.jitterPercent,
  jitterRotation = D.jitterRotation,
  durationSec = D.durationSec,
}: CursorMagnetGridProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Memo'd config-on-a-ref so the per-frame mousemove callback always reads
  // the latest values without re-binding listeners on every prop change.
  const cfg = useMemo(
    () => ({
      columns,
      activeScale,
      baseScale,
      pushForce,
      jitterPercent,
      jitterRotation,
      durationSec,
    }),
    [columns, activeScale, baseScale, pushForce, jitterPercent, jitterRotation, durationSec],
  );
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    if (!root || !container) return;

    const tiles = tileRefs.current.filter((t): t is HTMLDivElement => t !== null);
    if (tiles.length === 0) return;

    let currentIndex = -1;

    // Apply initial jitter + orientation detection.
    tiles.forEach((tile) => {
      const c = cfgRef.current;
      gsap.set(tile, {
        xPercent: (Math.random() - 0.5) * c.jitterPercent,
        yPercent: (Math.random() - 0.5) * c.jitterPercent,
        rotation: (Math.random() - 0.5) * c.jitterRotation,
        scale: c.baseScale,
      });

      const img = tile.querySelector("img");
      if (!img) return;
      const setOrientation = () => {
        img.classList.remove("cmg-portrait", "cmg-landscape");
        img.classList.add(img.naturalHeight > img.naturalWidth ? "cmg-portrait" : "cmg-landscape");
      };
      if (img.complete && img.naturalWidth) setOrientation();
      else img.addEventListener("load", setOrientation, { once: true });
    });

    function resetTile(index: number) {
      const c = cfgRef.current;
      gsap.to(tiles[index], {
        xPercent: (Math.random() - 0.5) * c.jitterPercent,
        yPercent: (Math.random() - 0.5) * c.jitterPercent,
        rotation: (Math.random() - 0.5) * c.jitterRotation,
        scale: c.baseScale,
        duration: c.durationSec,
        ease: "elastic.out(1, 0.75)",
      });
    }

    function activateTile(activeIdx: number) {
      const c = cfgRef.current;
      const cols = c.columns;
      const aCol = activeIdx % cols;
      const aRow = Math.floor(activeIdx / cols);

      tiles.forEach((tile, index) => {
        if (index === activeIdx) {
          gsap.to(tile, {
            xPercent: 0,
            yPercent: 0,
            rotation: 0,
            scale: c.activeScale,
            duration: c.durationSec,
            ease: "elastic.out(1, 0.75)",
          });
        } else {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const dx = col - aCol;
          const dy = row - aRow;
          const distSq = dx * dx + dy * dy;
          // Inverse-square push so neighbours fan outward; far corners barely move.
          gsap.to(tile, {
            xPercent: (c.pushForce * dx) / distSq,
            yPercent: (c.pushForce * dy) / distSq,
            rotation: 0,
            scale: c.baseScale,
            duration: c.durationSec,
            ease: "elastic.out(1, 0.75)",
          });
        }
      });
    }

    function onMove(e: MouseEvent) {
      let closestIndex = -1;
      let closestDist = Infinity;

      for (let i = 0; i < tiles.length; i++) {
        const rect = tiles[i].getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = dx * dx + dy * dy;
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      if (closestIndex !== currentIndex && closestIndex !== -1) {
        if (currentIndex !== -1) resetTile(currentIndex);
        currentIndex = closestIndex;
        activateTile(currentIndex);
      }
    }

    function onLeave() {
      if (currentIndex !== -1) resetTile(currentIndex);
      currentIndex = -1;

      const c = cfgRef.current;
      tiles.forEach((tile) => {
        gsap.to(tile, {
          xPercent: (Math.random() - 0.5) * c.jitterPercent,
          yPercent: (Math.random() - 0.5) * c.jitterPercent,
          rotation: (Math.random() - 0.5) * c.jitterRotation,
          scale: c.baseScale,
          duration: c.durationSec,
          ease: "elastic.out(1, 0.75)",
        });
      });
    }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      tiles.forEach((tile) => gsap.set(tile, { clearProps: "transform" }));
    };
  }, [
    items.length,
    columns,
    jitterPercent,
    jitterRotation,
    baseScale,
  ]);

  const sectionStyle: React.CSSProperties = {
    background:
      background === "dark"
        ? "var(--surface, #121212)"
        : "var(--surface-inverse, #fdfcfc)",
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="cmg-root relative w-full grid place-items-center"
      style={{ minHeight: "100dvh", ...sectionStyle }}
    >
      {/* Preload all images on mount so first-hover swap is instant + no
          flash-and-load while the cursor traverses tiles. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          left: -9999,
        }}
      >
        {items.map((it) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`pre-${it.id}`} src={it.src} alt="" loading="eager" decoding="async" />
        ))}
      </div>

      <div
        ref={containerRef}
        className="cmg-container grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${tileGapPx}px`,
        }}
      >
        {items.map((it, i) => (
          <div
            key={it.id}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className="cmg-tile flex items-center justify-center"
            style={{
              width: `${tileSizeVw}vw`,
              aspectRatio: "1",
              willChange: "transform",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.src}
              alt={it.alt ?? ""}
              className="cmg-media"
              draggable={false}
              style={{
                display: "block",
                borderRadius: `${imageRadiusPx}px`,
                userSelect: "none",
                WebkitUserDrag: "none",
                // Orientation classes (set on load) override these.
                maxWidth: "100%",
                maxHeight: "100%",
              } as React.CSSProperties}
            />
          </div>
        ))}
      </div>

      <style>{`
        /* Orientation rules: keep the tile square, fit the image to its long
           axis. Without these, the natural-size image either overflows or
           collapses depending on aspect. */
        .cmg-tile img.cmg-landscape { width: 100%; height: auto; }
        .cmg-tile img.cmg-portrait { width: auto; height: 100%; }
        @media (max-width: 768px) {
          .cmg-container > .cmg-tile {
            width: var(--cmg-tile-mobile, 23vw) !important;
          }
        }
      `}</style>
    </section>
  );
}
