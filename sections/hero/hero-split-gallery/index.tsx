"use client";

/**
 * HeroSplitGallery — split hero with a dual-column vertical-marquee gallery.
 *
 * Left column: eyebrow, display headline, supporting copy, single CTA.
 * Right column: two side-by-side image strips that scroll in opposite
 * directions inside a faded frame. Layout / structure / animation adapted
 * from a public reference; all styles translated to the project's tokens.
 */

import * as React from "react";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type Cta = { label: string; href: string };
type GalleryImage = { src: string; alt: string };

export type HeroSplitGalleryProps = {
  position?: number;
  eyebrow?: string;
  headline?: string;
  supporting?: string;
  cta?: Cta;
  leftImages?: GalleryImage[];
  rightImages?: GalleryImage[];
};

const DEFAULT_CTA: Cta = { label: "Get started", href: "#" };

const DEFAULT_LEFT: GalleryImage[] = [
  {
    src: "https://picsum.photos/seed/hero-gallery-left-1/800/1200",
    alt: "A high-tech manufacturing facility, soft light, a single figure walking through.",
  },
  {
    src: "https://picsum.photos/seed/hero-gallery-left-2/800/1200",
    alt: "A creative portrait with clouds reflecting in sunglasses.",
  },
  {
    src: "https://picsum.photos/seed/hero-gallery-left-3/800/1200",
    alt: "A modern, open-concept workspace with natural light and greenery.",
  },
];

const DEFAULT_RIGHT: GalleryImage[] = [
  {
    src: "https://picsum.photos/seed/hero-gallery-right-1/800/1200",
    alt: "A serene mountain landscape with misty hills.",
  },
  {
    src: "https://picsum.photos/seed/hero-gallery-right-2/800/1200",
    alt: "Two people in a minimalist office, blazers, considered light.",
  },
  {
    src: "https://picsum.photos/seed/hero-gallery-right-3/800/1200",
    alt: "A vivid cloudscape against bright blue sky.",
  },
];

export function HeroSplitGallery({
  position,
  eyebrow = "About us",
  headline = "We bridge the gap between concept and creation.",
  supporting = "Helping you unlock business potential with strategic consulting every step of the way.",
  cta = DEFAULT_CTA,
  leftImages = DEFAULT_LEFT,
  rightImages = DEFAULT_RIGHT,
}: HeroSplitGalleryProps) {
  const leftStripRef = React.useRef<HTMLDivElement>(null);
  const rightStripRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const left = leftStripRef.current;
    const right = rightStripRef.current;
    if (!left || !right) return;

    // Respect reduced motion — hold a static frame, no animation loop.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      left.style.transform = "translateY(-25%)";
      right.style.transform = "translateY(-25%)";
      return;
    }

    let raf = 0;
    let leftPos = 0;
    let rightPos = -50;
    const speed = 0.09;

    const tick = () => {
      leftPos += speed;
      if (leftPos >= 0) leftPos = -50;
      rightPos -= speed;
      if (rightPos <= -100) rightPos = -50;

      left.style.transform = `translateY(${leftPos}%)`;
      right.style.transform = `translateY(${rightPos}%)`;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
        <div className="col-span-12 min-[48rem]:col-span-6 flex flex-col gap-6 justify-center min-[48rem]:py-12">
          <p className="text-label-large uppercase text-accent">{eyebrow}</p>
          <h1 className="text-heading-1 font-display font-light text-fg max-w-[18ch]">
            {headline}
          </h1>
          <p className="text-body-large text-fg-muted max-w-[42ch]">
            {supporting}
          </p>
          <div className="pt-2">
            <a href={cta.href} className="btn btn-primary btn-large">
              {cta.label}
            </a>
          </div>
        </div>

        {/* Right — dual-column marquee gallery */}
        <div className="col-span-12 min-[48rem]:col-span-6 relative h-[600px] min-[48rem]:h-[820px] overflow-hidden">
          {/* Top fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[140px] min-[48rem]:h-[220px]"
            style={{
              background:
                "linear-gradient(to bottom, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent) 45%, transparent)",
            }}
          />
          {/* Bottom fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[140px] min-[48rem]:h-[220px]"
            style={{
              background:
                "linear-gradient(to top, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent) 45%, transparent)",
            }}
          />

          <div className="flex h-full justify-between gap-5">
            {/* Strip A — scrolls down */}
            <div
              ref={leftStripRef}
              className="flex w-1/2 flex-col gap-5"
              style={{ willChange: "transform" }}
            >
              {[...leftImages, ...leftImages].map((img, i) => (
                <div
                  key={`a-${i}`}
                  className="w-full shrink-0 aspect-[4/5] min-[48rem]:aspect-[3/4] rounded-md overflow-hidden bg-surface-muted"
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

            {/* Strip B — scrolls up, hidden at smallest viewport */}
            <div
              ref={rightStripRef}
              className="hidden min-[40rem]:flex w-1/2 flex-col gap-5"
              style={{ willChange: "transform" }}
            >
              {[...rightImages, ...rightImages].map((img, i) => (
                <div
                  key={`b-${i}`}
                  className="w-full shrink-0 aspect-[4/5] min-[48rem]:aspect-[3/4] rounded-md overflow-hidden bg-surface-muted"
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
