"use client";

/**
 * ParallaxImageColumns — full-bleed gallery panel with image columns that
 * translate upward at different scroll-driven rates, producing a parallax
 * effect as the viewer scrolls through the section.
 *
 * Adapted from a public reference (Skiper UI / Skiper30). Original used
 * framer-motion + Lenis-in-component. Ported to the canonical stack:
 *   - Motion via GSAP ScrollTrigger (scrubbed, 1:1 with scroll)
 *   - Smooth scroll consumed from the root Lenis singleton (MotionProvider)
 *   - Tokens for all colours; no hardcoded hex
 *   - prefers-reduced-motion respected via gsap.matchMedia
 *
 * Gap-free guarantee (this revision):
 *
 *   The number of images per column is computed on mount (and resize) from
 *   the actual viewport, so each column is always at least as tall as the
 *   parallax demands. For column `i` with offset `offset_i` and factor
 *   `factor_i`, no gap appears when:
 *
 *     col_height ≥ MAX( factor_i · vh / offset_i,  gallery_h / (1 − offset_i) )
 *
 *   We compute the worst-case required height across all columns, plus a
 *   200px safety margin, then render `ceil(required / image_height)` images
 *   per column. The pool cycles round-robin.
 *
 *   The image cells carry `shrink-0` so flex can never compress them — that
 *   was the silent reason cells were rendering as squashed landscape boxes
 *   even with aspect-ratio set: a flex column with `h-full` and many
 *   children compresses each child by default.
 */

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "@/components/section";
import manifest from "./section.json";
// Importing the design-system motion module ensures ScrollTrigger is registered
// at module-evaluation time, before any child component's useEffect runs.
import "@/design-system/motion";

type GalleryImage = { src: string; alt: string };

export type ParallaxImageColumnsProps = {
  position?: number;
  /** Eyebrow / scroll-cue label rendered above the gallery. */
  eyebrow?: string;
  /** Optional supporting line under the eyebrow. */
  caption?: string;
  /**
   * Image columns. If supplied, the caller's array at index `i` overrides
   * the round-robin default for column `i`. The number of columns actually
   * rendered is determined by the active layout (2 at <48rem, 4 at ≥48rem).
   * Unsupplied columns fall back to the seeded picsum defaults.
   */
  columns?: GalleryImage[][];
};

/** Photo pool. Each rendered column cycles through this pool round-robin. */
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

// ─── Layout constants ────────────────────────────────────────────────────────

const DESKTOP_BREAKPOINT_PX = 768; // 48rem
const GALLERY_FACTOR = 1.75; // matches className `h-[175vh]`
const IMAGE_HEIGHT_RATIO = 11 / 8; // aspect-[8/11] → height = width × 11/8
const VW_UNIT = 0.02; // matches `gap-[2vw]` and `px-[2vw]` / `py-[2vw]`
const SAFETY_PX = 200;
const MIN_SLOTS = 6;

// Offsets chosen so |X| ≥ factor / GALLERY_FACTOR for every column. That
// inequality is the no-top-gap condition: at scroll end the column has been
// translated DOWN by `factor × vh`; it must have started pulled UP by at
// least that distance (in viewport units) to avoid exposing empty space at
// the gallery's top edge. Offsets carry a small safety margin above the
// minimum so the math survives rounding and small layout drift.
const DESKTOP_LAYOUT = {
  columns: 4,
  factors: [1.0, 1.6, 0.6, 1.3] as const,
  offsets: ["-60%", "-95%", "-40%", "-80%"] as const,
};

const MOBILE_LAYOUT = {
  columns: 2,
  factors: [0.7, 1.2] as const,
  offsets: ["-45%", "-75%"] as const,
};

type DerivedConfig = {
  columns: number;
  slots: number;
  factors: readonly number[];
  offsets: readonly string[];
};

/**
 * Derive the layout config from current viewport dimensions. Computes the
 * minimum slot count per column that guarantees no gaps at any scroll
 * position, given the column's offset and factor.
 */
function deriveConfig(vw: number, vh: number): DerivedConfig {
  const isDesktop = vw >= DESKTOP_BREAKPOINT_PX;
  const base = isDesktop ? DESKTOP_LAYOUT : MOBILE_LAYOUT;

  const onePxVw = vw * VW_UNIT;
  const padding = 2 * onePxVw; // px-[2vw] one side
  const totalPadding = padding * 2;
  const totalGaps = (base.columns - 1) * onePxVw;
  const colWidth = Math.max(1, (vw - totalPadding - totalGaps) / base.columns);

  const imgHeight = colWidth * IMAGE_HEIGHT_RATIO;
  const itemGap = onePxVw;
  const galleryHeight = GALLERY_FACTOR * vh;

  // CSS `top: -X%` on a relative-positioned element uses the CONTAINING
  // BLOCK height (the gallery, GALLERY_FACTOR × vh) — NOT the element's
  // own height. That makes the two no-gap constraints independent:
  //
  //   • No TOP gap at scroll end:   |X_i| ≥ factor_i / GALLERY_FACTOR
  //     (fixed by choosing offsets — handled in the layout constants above)
  //
  //   • No BOTTOM gap at scroll start: cells_natural_h ≥ gallery_h × (1 + |X_i|)
  //     (fixed here by choosing enough images per column)
  //
  // We take the worst |X_i| across columns and size every column to satisfy
  // it (cheaper than per-column slot counts — image cells are lazy-loaded).
  let maxOffset = 0;
  for (let i = 0; i < base.columns; i++) {
    const offset = Math.abs(parseFloat(base.offsets[i] ?? "-40")) / 100;
    if (offset > maxOffset) maxOffset = offset;
  }
  const requiredHeight = galleryHeight * (1 + maxOffset) + SAFETY_PX;

  const slots = Math.max(
    MIN_SLOTS,
    Math.ceil(requiredHeight / (imgHeight + itemGap)),
  );

  return {
    columns: base.columns,
    slots,
    factors: base.factors,
    offsets: base.offsets,
  };
}

/** Round-robin fill across columns; caller overrides win at their index. */
function buildColumns(
  pool: GalleryImage[],
  columnCount: number,
  slotsPerColumn: number,
  override: GalleryImage[][] | undefined,
): GalleryImage[][] {
  const defaults: GalleryImage[][] = Array.from({ length: columnCount }, () => []);
  const slotsTotal = columnCount * slotsPerColumn;
  for (let i = 0; i < slotsTotal; i++) {
    defaults[i % columnCount].push(pool[i % pool.length]);
  }
  return Array.from(
    { length: columnCount },
    (_, i) => override?.[i] ?? defaults[i],
  );
}

export function ParallaxImageColumns({
  position,
  eyebrow = "Scroll",
  caption,
  columns,
}: ParallaxImageColumnsProps) {
  // Stable SSR default — desktop layout at typical desktop dimensions. The
  // mount effect updates this with real viewport values, avoiding hydration
  // mismatch (server always renders the same shape).
  const [config, setConfig] = React.useState<DerivedConfig>(() =>
    deriveConfig(1280, 900),
  );

  React.useEffect(() => {
    const update = () => setConfig(deriveConfig(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const resolved = React.useMemo(
    () => buildColumns(PHOTO_POOL, config.columns, config.slots, columns),
    [config, columns],
  );

  const galleryRef = React.useRef<HTMLDivElement>(null);
  const columnRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const vh = window.innerHeight;
      columnRefs.current.forEach((col, i) => {
        if (!col) return;
        gsap.to(col, {
          y: vh * (config.factors[i] ?? 1),
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
      ScrollTrigger.refresh();
    });

    return () => {
      mm.kill();
    };
  }, [resolved, config]);

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
            // Key includes layout shape so React fully remounts on breakpoint
            // change / slot-count change → GSAP cleanup runs cleanly and the
            // ref array is rebuilt against the new DOM.
            key={`${config.columns}-${config.slots}-${colIndex}`}
            ref={(el) => {
              columnRefs.current[colIndex] = el;
            }}
            // `top` is a static offset (not animated). GSAP animates `y` on
            // top of this baseline so the two don't fight. `flex-1` shares
            // available width across the active column count. NO `h-full`:
            // we want the column to extend to its natural content height
            // (driven by `shrink-0` on the image cells) so the parallax has
            // enough vertical content to cover the full scroll range.
            className="relative flex flex-1 flex-col gap-[2vw]"
            style={{
              top: config.offsets[colIndex] ?? "-40%",
              willChange: "transform",
            }}
          >
            {images.map((img, i) => (
              <div
                key={i}
                // `shrink-0` is critical: without it, the flex column would
                // compress every cell to fit inside its parent, overriding
                // the aspect ratio and rendering portraits as squashed
                // landscape boxes.
                className="relative aspect-[8/11] w-full shrink-0 overflow-hidden rounded-sm bg-surface-elevated"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="pointer-events-none h-full w-full object-cover"
                  onError={(e) => {
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
