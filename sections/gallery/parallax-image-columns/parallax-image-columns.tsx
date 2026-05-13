"use client";

/**
 * ParallaxImageColumns — full-bleed gallery panel with four image columns
 * that translate upward at different scroll-driven rates, producing a
 * parallax effect as the viewer scrolls through the section.
 *
 * Adapted from a public reference (Skiper UI / Skiper30). Original used
 * framer-motion + Lenis-in-component. Ported to the canonical stack:
 *   - Motion via GSAP ScrollTrigger (scrubbed, 1:1 with scroll)
 *   - Smooth scroll consumed from the root Lenis singleton (MotionProvider)
 *   - Tokens for all colours; no hardcoded hex
 *   - prefers-reduced-motion respected via gsap.matchMedia
 */

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "@/components/section";
import manifest from "./section.json";
// Importing the design-system motion module ensures ScrollTrigger is registered
// at module-evaluation time, before any child component's useEffect runs.
// (React effect order is bottom-up, so MotionProvider's mount effect would be
// too late — see design-system/motion.ts for the systemic fix.)
import "@/design-system/motion";

type GalleryImage = { src: string; alt: string };

export type ParallaxImageColumnsProps = {
  position?: number;
  /** Eyebrow / scroll-cue label rendered above the gallery. */
  eyebrow?: string;
  /** Optional supporting line under the eyebrow. */
  caption?: string;
  /**
   * Four columns of three images each. Defaults to seeded picsum placeholders.
   * If fewer than four columns are supplied, defaults fill the rest.
   */
  columns?: GalleryImage[][];
};

/**
 * Photo pool. The component renders 4 columns × 3 slots = 12 images, cycling
 * through this pool. If the pool is shorter than the slot count, photos
 * duplicate to fill — never leave an empty block. Adding more photos here
 * varies the visible set automatically.
 */
const PHOTO_POOL: GalleryImage[] = [
  { src: "https://picsum.photos/seed/parallax-image-columns-0/800/1100", alt: "Alika Reynard" },
  { src: "https://picsum.photos/seed/parallax-image-columns-1/800/1100", alt: "Alyssa Bhagaloo" },
  { src: "https://picsum.photos/seed/parallax-image-columns-2/800/1100", alt: "Amy Leigh Tayler" },
  { src: "https://picsum.photos/seed/parallax-image-columns-3/800/1100", alt: "Eryn Voogt" },
  { src: "https://picsum.photos/seed/parallax-image-columns-4/800/1100", alt: "Jessica McLachlan" },
  { src: "https://picsum.photos/seed/parallax-image-columns-5/800/1100", alt: "Keanan Kirsten" },
  { src: "https://picsum.photos/seed/parallax-image-columns-6/800/1100", alt: "Monique Kleynhans" },
  { src: "https://picsum.photos/seed/parallax-image-columns-7/800/1100", alt: "Nic Helme" },
  { src: "https://picsum.photos/seed/parallax-image-columns-8/800/1100", alt: "Nicole Sittig" },
  { src: "https://picsum.photos/seed/parallax-image-columns-9/800/1100", alt: "Noah" },
  { src: "https://picsum.photos/seed/parallax-image-columns-10/800/1100", alt: "Petrus Hanekom" },
  { src: "https://picsum.photos/seed/parallax-image-columns-11/800/1100", alt: "Robert Fripp" },
  { src: "https://picsum.photos/seed/parallax-image-columns-12/800/1100", alt: "Shiven Govender" },
  { src: "https://picsum.photos/seed/parallax-image-columns-13/800/1100", alt: "Stefan Kunz" },
  { src: "https://picsum.photos/seed/parallax-image-columns-14/800/1100", alt: "Thato Ndaba" },
  { src: "https://picsum.photos/seed/parallax-image-columns-15/800/1100", alt: "Theresa Rose" },
  { src: "https://picsum.photos/seed/parallax-image-columns-16/800/1100", alt: "Warren McEwan" },
];

/** A guaranteed-loadable fallback used when an image fires onError. */
const FALLBACK_PHOTO = PHOTO_POOL[0];

/**
 * Build 4 columns × 3 photos by cycling the pool. Pool is interleaved across
 * columns (round-robin) so the 1st, 2nd, 3rd, 4th photos seed columns
 * 0/1/2/3 in turn — gives more visual variety than reading the pool
 * sequentially into each column.
 */
function buildDefaultColumns(pool: GalleryImage[]): GalleryImage[][] {
  const cols: GalleryImage[][] = [[], [], [], []];
  const slotsTotal = 4 * 3;
  for (let i = 0; i < slotsTotal; i++) {
    cols[i % 4].push(pool[i % pool.length]);
  }
  return cols;
}

const DEFAULT_COLUMNS: GalleryImage[][] = buildDefaultColumns(PHOTO_POOL);

/** Per-column upward translate factor (× gallery height). Different rates
 * break visual rhythm so columns don't move as a slab. */
const FACTORS = [2, 3.3, 1.25, 3] as const;

/** Per-column initial offset (% of column height pulled upward at rest).
 * Staggers the visible image range across columns so they aren't synced. */
const START_OFFSETS = ["-45%", "-95%", "-45%", "-75%"] as const;

export function ParallaxImageColumns({
  position,
  eyebrow = "Scroll",
  caption,
  columns = DEFAULT_COLUMNS,
}: ParallaxImageColumnsProps) {
  // Always render exactly 4 columns — pad with defaults if caller supplied fewer.
  const resolved: GalleryImage[][] = React.useMemo(
    () => Array.from({ length: 4 }, (_, i) => columns[i] ?? DEFAULT_COLUMNS[i]),
    [columns],
  );

  const galleryRef = React.useRef<HTMLDivElement>(null);
  const columnRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        animate: "(prefers-reduced-motion: no-preference)",
      },
      () => {
        const height = window.innerHeight;
        columnRefs.current.forEach((col, i) => {
          if (!col) return;
          // Columns start pulled UP via `top: -*%` (static baseline) and
          // translate DOWN as the gallery scrolls past — slower-than-scroll
          // columns reveal more of their top as the viewer descends.
          gsap.to(col, {
            y: height * FACTORS[i],
            ease: "none",
            scrollTrigger: {
              trigger: gallery,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        });

        // Refresh once after fonts/images settle.
        ScrollTrigger.refresh();
      },
    );

    return () => {
      mm.kill();
    };
  }, [resolved]);

  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="bg-surface-muted text-fg"
    >
      {/* Cue band — sits inside the section, full-bleed. */}
      <div className="flex h-screen items-center justify-center">
        <div className="grid content-start justify-items-center gap-6 text-center">
          <span
            className="
              relative max-w-[14ch] uppercase
              text-label-small text-fg-muted
              after:absolute after:left-1/2 after:top-full after:mt-4
              after:h-16 after:w-px
              after:bg-gradient-to-b after:from-transparent after:to-fg-subtle
              after:content-['']
            "
          >
            {eyebrow}
          </span>
          {caption ? (
            <p className="max-w-[36ch] text-body-small text-fg-subtle">{caption}</p>
          ) : null}
        </div>
      </div>

      {/* The parallax gallery itself. Full-bleed; columns translate within. */}
      <div
        ref={galleryRef}
        className="
          relative box-border flex h-[175vh] gap-[2vw] overflow-hidden
          bg-surface px-[2vw] py-[2vw]
        "
      >
        {resolved.map((images, colIndex) => (
          <div
            key={colIndex}
            ref={(el) => {
              columnRefs.current[colIndex] = el;
            }}
            // `top` is a static offset (not animated). GSAP animates `y`
            // (transform) on top of this baseline so the two don't fight.
            className="relative flex h-full w-1/4 min-w-[200px] flex-col gap-[2vw]"
            style={{ top: START_OFFSETS[colIndex], willChange: "transform" }}
          >
            {images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-surface-elevated"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="pointer-events-none h-full w-full object-cover"
                  onError={(e) => {
                    // If a portrait fails to load, swap to the guaranteed
                    // fallback so the grid never shows an empty block.
                    const t = e.currentTarget;
                    if (t.dataset.fallbackApplied) return;
                    t.dataset.fallbackApplied = "true";
                    t.src = FALLBACK_PHOTO.src;
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

export default ParallaxImageColumns;
