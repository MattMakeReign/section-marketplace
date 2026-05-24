"use client";

/**
 * HeroSplitGallery — split hero with a marquee gallery.
 *
 * Layout:
 *   • ≥48rem (md+): two-column. Left = eyebrow, headline, supporting, CTA.
 *     Right = dual-column vertical marquee (strips scroll in opposite
 *     directions inside a top/bottom faded frame).
 *   • <48rem: stacked. Copy on top, then a single full-width horizontal
 *     marquee underneath with left/right faded frame.
 *
 * The marquee wrap distance is pixel-measured from the offset of the first
 * duplicated item in each strip, so it's seamless regardless of gap or
 * image aspect ratio. Re-measures on resize, breakpoint change, and a
 * short post-mount delay (to cover picsum load shifts). Respects
 * `prefers-reduced-motion` by holding a static frame.
 */

import * as React from "react";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type Cta = { label: string; href: string };
export type GalleryImage = { src: string; alt: string; filename: string };

const SECTION_ID = "hero-split-gallery";
const assetUrl = (filename: string) => `/api/section-asset/${SECTION_ID}/${filename}`;

export type HeroSplitGalleryProps = {
  position?: number;
  eyebrow?: string;
  headline?: string;
  supporting?: string;
  cta?: Cta;
  leftImages?: GalleryImage[];
  rightImages?: GalleryImage[];
  headlineAlign?: "left" | "center" | "right";
  /** Text column width out of 12. Gallery fills remainder. */
  textCols?: 4 | 5 | 6 | 7;
  /** Drift speed in px/frame (~24fps baseline). */
  galleryDriftSpeed?: number;
  /** Image card corner radius (px). */
  imageRadiusPx?: number;
};

const DEFAULT_CTA: Cta = { label: "Get started", href: "#" };

export const DEFAULT_LEFT: GalleryImage[] = [
  { filename: "left-1.jpg", src: "https://picsum.photos/seed/hero-gallery-left-1/800/1200", alt: "Manufacturing facility." },
  { filename: "left-2.jpg", src: "https://picsum.photos/seed/hero-gallery-left-2/800/1200", alt: "Portrait with sunglasses." },
  { filename: "left-3.jpg", src: "https://picsum.photos/seed/hero-gallery-left-3/800/1200", alt: "Modern open workspace." },
];

export const DEFAULT_RIGHT: GalleryImage[] = [
  { filename: "right-1.jpg", src: "https://picsum.photos/seed/hero-gallery-right-1/800/1200", alt: "Mountain landscape." },
  { filename: "right-2.jpg", src: "https://picsum.photos/seed/hero-gallery-right-2/800/1200", alt: "Minimalist office." },
  { filename: "right-3.jpg", src: "https://picsum.photos/seed/hero-gallery-right-3/800/1200", alt: "Vivid cloudscape." },
];

const DEFAULT_DRIFT = 0.4; // ~24px/s at 60fps — calm editorial drift

export function HeroSplitGallery({
  position,
  eyebrow = "About us",
  headline = "We bridge the gap between concept and creation.",
  supporting = "Helping you unlock business potential with strategic consulting every step of the way.",
  cta = DEFAULT_CTA,
  leftImages = DEFAULT_LEFT,
  rightImages = DEFAULT_RIGHT,
  headlineAlign = "left",
  textCols = 6,
  galleryDriftSpeed = 0.4,
  imageRadiusPx = 16,
}: HeroSplitGalleryProps) {
  const desktopLeftRef = React.useRef<HTMLDivElement>(null);
  const desktopRightRef = React.useRef<HTMLDivElement>(null);
  const mobileRowRef = React.useRef<HTMLDivElement>(null);

  // Mobile gallery interleaves both columns so the horizontal marquee
  // surfaces the full set of imagery rather than just one strip.
  const mobileImages = React.useMemo(() => {
    const out: GalleryImage[] = [];
    const max = Math.max(leftImages.length, rightImages.length);
    for (let i = 0; i < max; i++) {
      if (leftImages[i]) out.push(leftImages[i]);
      if (rightImages[i]) out.push(rightImages[i]);
    }
    return out;
  }, [leftImages, rightImages]);

  React.useEffect(() => {
    const mqlDesktop = window.matchMedia("(min-width: 48rem)");
    const mqlReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const measureOffset = (
      el: HTMLElement,
      index: number,
      axis: "y" | "x",
    ): number => {
      const child = el.children[index] as HTMLElement | undefined;
      if (!child) return 0;
      return axis === "y" ? child.offsetTop : child.offsetLeft;
    };

    const setup = () => {
      cancelAnimationFrame(raf);

      if (mqlDesktop.matches) {
        const left = desktopLeftRef.current;
        const right = desktopRightRef.current;
        if (!left || !right) return;

        const leftWrap = measureOffset(left, leftImages.length, "y");
        const rightWrap = measureOffset(right, rightImages.length, "y");

        if (mqlReduced.matches || leftWrap === 0 || rightWrap === 0) {
          left.style.transform = `translate3d(0, ${-leftWrap / 2}px, 0)`;
          right.style.transform = `translate3d(0, ${-rightWrap / 2}px, 0)`;
          return;
        }

        let leftY = 0;
        let rightY = -rightWrap;

        const tick = () => {
          leftY -= galleryDriftSpeed;
          if (leftY <= -leftWrap) leftY += leftWrap;
          rightY += galleryDriftSpeed;
          if (rightY >= 0) rightY -= rightWrap;
          left.style.transform = `translate3d(0, ${leftY}px, 0)`;
          right.style.transform = `translate3d(0, ${rightY}px, 0)`;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } else {
        const row = mobileRowRef.current;
        if (!row) return;

        const wrap = measureOffset(row, mobileImages.length, "x");

        if (mqlReduced.matches || wrap === 0) {
          row.style.transform = `translate3d(${-wrap / 2}px, 0, 0)`;
          return;
        }

        let x = 0;
        const tick = () => {
          x -= galleryDriftSpeed;
          if (x <= -wrap) x += wrap;
          row.style.transform = `translate3d(${x}px, 0, 0)`;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    };

    setup();

    // Re-measure once images settle — picsum loads can shift layout slightly
    // even with aspect-ratio in play (e.g. if a parent reflows).
    const settleTimer = window.setTimeout(setup, 400);

    mqlDesktop.addEventListener("change", setup);
    mqlReduced.addEventListener("change", setup);
    window.addEventListener("resize", setup);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
      mqlDesktop.removeEventListener("change", setup);
      mqlReduced.removeEventListener("change", setup);
      window.removeEventListener("resize", setup);
    };
  }, [leftImages.length, rightImages.length, mobileImages.length]);

  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-xl bg-surface text-fg overflow-hidden"
    >
      <SectionGrid>
        {/* Left — text */}
        <div className={`col-span-12 ${
          textCols === 4 ? "min-[48rem]:col-span-4"
          : textCols === 5 ? "min-[48rem]:col-span-5"
          : textCols === 7 ? "min-[48rem]:col-span-7"
          : "min-[48rem]:col-span-6"
        } flex flex-col gap-6 justify-center min-[48rem]:py-12 ${
          headlineAlign === "center" ? "items-center text-center"
          : headlineAlign === "right" ? "items-end text-right"
          : "items-start text-left"
        }`}>
          <p className="text-label-large uppercase text-accent m-0">{eyebrow}</p>
          <h1 className="text-heading-1 font-display font-light text-fg max-w-[18ch] m-0">
            {headline}
          </h1>
          <p className="text-body-large text-fg-muted max-w-[42ch] m-0">
            {supporting}
          </p>
          <div className="pt-2">
            <a href={cta.href} className="btn btn-primary btn-large">
              {cta.label}
            </a>
          </div>
        </div>

        {/* Mobile / Tablet — single horizontal marquee under the copy */}
        <div className="col-span-12 min-[48rem]:hidden relative h-[360px] overflow-hidden">
          {/* Left fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[96px]"
            style={{
              background:
                "linear-gradient(to right, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent) 45%, transparent)",
            }}
          />
          {/* Right fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[96px]"
            style={{
              background:
                "linear-gradient(to left, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent) 45%, transparent)",
            }}
          />

          <div
            ref={mobileRowRef}
            className="flex h-full gap-5"
            style={{ willChange: "transform" }}
          >
            {[...mobileImages, ...mobileImages].map((img, i) => (
              <div
                key={`m-${i}`}
                className="h-full shrink-0 aspect-[3/4] overflow-hidden bg-surface-muted" style={{borderRadius:imageRadiusPx}}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop — dual-column vertical marquee */}
        <div className="hidden min-[48rem]:block col-span-6 relative h-[820px] overflow-hidden">
          {/* Top fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[220px]"
            style={{
              background:
                "linear-gradient(to bottom, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent) 45%, transparent)",
            }}
          />
          {/* Bottom fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[220px]"
            style={{
              background:
                "linear-gradient(to top, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent) 45%, transparent)",
            }}
          />

          <div className="flex h-full justify-between gap-5">
            {/* Strip A — scrolls up */}
            <div
              ref={desktopLeftRef}
              className="flex w-1/2 flex-col gap-5"
              style={{ willChange: "transform" }}
            >
              {[...leftImages, ...leftImages].map((img, i) => (
                <div
                  key={`a-${i}`}
                  className="w-full shrink-0 aspect-[3/4] overflow-hidden bg-surface-muted" style={{borderRadius:imageRadiusPx}}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Strip B — scrolls down */}
            <div
              ref={desktopRightRef}
              className="flex w-1/2 flex-col gap-5"
              style={{ willChange: "transform" }}
            >
              {[...rightImages, ...rightImages].map((img, i) => (
                <div
                  key={`b-${i}`}
                  className="w-full shrink-0 aspect-[3/4] overflow-hidden bg-surface-muted" style={{borderRadius:imageRadiusPx}}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionGrid>
    </Section>
  );
}

export default HeroSplitGallery;
