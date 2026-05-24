"use client";

/**
 * FeaturesMarquee — centered editorial header over a full-width horizontal
 * marquee of portrait image cards.
 *
 * Layout / structure / interactions adapted from a public reference; all
 * styles translated to the project's tokens. Marquee, parallax, and heading
 * entrance behaviours preserved.
 */

import * as React from "react";
import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export type FeaturesMarqueeItem = {
  src: string;
  srcSet?: string;
  alt?: string;
  labels: string[];
  /** Asset filename inside `sections/features-marquee/assets/` — present
   *  when the image lives on disk (vs. an external URL). Used by the editor
   *  Media accordion to target the right path on uploads. */
  filename?: string;
};

export type FeaturesMarqueeProps = {
  position?: number;
  eyebrow?: string;
  heading?: string;
  items?: FeaturesMarqueeItem[];
  /** Marquee direction. Left = items scroll right-to-left (default). */
  direction?: "left" | "right";
  /** Loop duration in seconds (lower = faster). */
  durationSeconds?: number;
  /** Card width at desktop (px). */
  cardWidthPx?: number;
  /** Card height at desktop (px). When equal to width = square. */
  cardHeightPx?: number;
  /** Card corner radius (px). */
  cardRadiusPx?: number;
  /** Gap between cards in the marquee (px). */
  cardGapPx?: number;
  /** Parallax depth — 0 disables; 60 is default; 120 is aggressive. */
  parallaxPx?: number;
  /** Pause the marquee while the cursor is over it. */
  pauseOnHover?: boolean;
  /** Show the eyebrow pill + heading above the marquee. */
  showHeader?: boolean;
  /** Show the label list overlaid on each card. */
  showLabels?: boolean;
  /** Header alignment. */
  headerAlign?: "left" | "center" | "right";
};

export const DEFAULT_ITEMS: FeaturesMarqueeItem[] = [
  {
    src: "https://picsum.photos/seed/halse-still-1/1100/1320",
    srcSet:
      "https://picsum.photos/seed/halse-still-1/1100/1320 500w, https://picsum.photos/seed/halse-still-1/1100/1320 800w, https://picsum.photos/seed/halse-still-1/1100/1320 1071w",
    alt: "",
    labels: ["Bestselling designer", "Transform your identity", "Awesome fonts!"],
  },
  {
    src: "https://picsum.photos/seed/halse-still-2/1100/1320",
    srcSet:
      "https://picsum.photos/seed/halse-still-2/1100/1320 500w, https://picsum.photos/seed/halse-still-2/1100/1320 800w, https://picsum.photos/seed/halse-still-2/1100/1320 912w",
    alt: "",
    labels: [
      "State-of-the-Art Platform",
      "A lasting first impression",
      "Bestselling Expertise",
    ],
  },
  {
    src: "https://picsum.photos/seed/halse-still-3/1100/1320",
    srcSet:
      "https://picsum.photos/seed/halse-still-3/1100/1320 500w, https://picsum.photos/seed/halse-still-3/1100/1320 800w, https://picsum.photos/seed/halse-still-3/1100/1320 1080w, https://picsum.photos/seed/halse-still-3/1100/1320 1380w",
    alt: "",
    labels: [
      "Bestselling designer",
      "A lasting first impression",
      "Awesome fonts!",
    ],
  },
  {
    src: "https://picsum.photos/seed/halse-still-4/1100/1320",
    srcSet:
      "https://picsum.photos/seed/halse-still-4/1100/1320 500w, https://picsum.photos/seed/halse-still-4/1100/1320 800w, https://picsum.photos/seed/halse-still-4/1100/1320 1071w",
    alt: "",
    labels: [
      "A lasting first impression",
      "Bestselling Expertise",
      "State-of-the-Art Platform",
    ],
  },
  {
    src: "https://picsum.photos/seed/halse-still-5/1100/1320",
    srcSet:
      "https://picsum.photos/seed/halse-still-5/1100/1320 500w, https://picsum.photos/seed/halse-still-5/1100/1320 800w, https://picsum.photos/seed/halse-still-5/1100/1320 1080w, https://picsum.photos/seed/halse-still-5/1100/1320 1380w",
    alt: "",
    labels: [
      "Bestselling Expertise",
      "State-of-the-Art Platform",
      "Awesome fonts!",
    ],
  },
];

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.9987 1.33594V10.6693M1.33203 6.0026H10.6654"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

function ImageCard({
  item,
  widthPx,
  heightPx,
  radiusPx,
  parallaxPx,
  showLabels,
  trailingGapPx,
}: {
  item: FeaturesMarqueeItem;
  widthPx: number;
  heightPx: number;
  radiusPx: number;
  parallaxPx: number;
  showLabels: boolean;
  trailingGapPx: number;
}) {
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Scroll-tied parallax: image is taller than the card, shifts up as the
  // card crosses the viewport. `parallaxPx=0` disables the effect.
  React.useEffect(() => {
    if (parallaxPx <= 0) return;
    const onScroll = () => {
      const img = imgRef.current;
      if (!img) return;
      const parent = img.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const progress = -rect.top / window.innerHeight;
      img.style.transform = `translateY(calc(-10% + ${progress * parallaxPx}px))`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallaxPx]);

  return (
    <div
      className="features-marquee-card relative flex-none overflow-hidden bg-surface-muted"
      style={{
        width: widthPx,
        height: heightPx,
        borderRadius: radiusPx,
        // Trailing gap baked into each card (incl. last in set). Makes
        // the pattern fully periodic so the -50% loop is seamless.
        marginRight: trailingGapPx,
      }}
    >
      <img
        ref={imgRef}
        src={item.src}
        srcSet={item.srcSet}
        sizes="100vw"
        alt={item.alt ?? ""}
        loading="lazy"
        className="absolute inset-0 w-full object-cover"
        style={{
          height: parallaxPx > 0 ? "150%" : "100%",
          transform: parallaxPx > 0 ? "translateY(-10%)" : "none",
          zIndex: 1,
        }}
      />
      {showLabels && item.labels.length > 0 ? (
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-start justify-end gap-2 pb-6 pl-6"
          style={{
            height: "50%",
            backgroundImage:
              "linear-gradient(0deg, color-mix(in srgb, var(--fg) 64%, transparent), transparent)",
            zIndex: 2,
          }}
        >
          {item.labels.map((label, i) => (
            <div key={i} className="flex flex-row items-center gap-3">
              <span className="flex items-center justify-center text-accent">
                <PlusIcon />
              </span>
              <span
                className="text-label-small font-mono uppercase"
                style={{ color: "var(--surface)", letterSpacing: "1px" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FeaturesMarquee({
  position,
  eyebrow = "Featured",
  heading = "A few essentials.",
  items = DEFAULT_ITEMS,
  direction = "left",
  durationSeconds = 40,
  cardWidthPx = 573,
  cardHeightPx = 573,
  // Mirrors design-system `--radius-cards-large` (16px). Slider can override.
  cardRadiusPx = 16,
  cardGapPx = 12,
  parallaxPx = 60,
  pauseOnHover = false,
  showHeader = true,
  showLabels = true,
  headerAlign = "center",
}: FeaturesMarqueeProps) {
  const durationSec = Math.max(8, Math.min(120, Math.round(durationSeconds)));
  const animDirection = direction === "right" ? "reverse" : "normal";
  const widthPx = Math.max(160, Math.min(960, Math.round(cardWidthPx)));
  const heightPx = Math.max(160, Math.min(960, Math.round(cardHeightPx)));
  const radiusPx = Math.max(0, Math.min(48, Math.round(cardRadiusPx)));
  const gapPx = Math.max(0, Math.min(64, Math.round(cardGapPx)));
  const parallax = Math.max(0, Math.min(200, Math.round(parallaxPx)));
  // Canonical scroll-in reveal — see `useReveal` in @mr/canonical-stack.
  // Heading fades + rises when it enters the viewport. Replaces the previous
  // bespoke IntersectionObserver + React-state pattern which left the heading
  // stranded at opacity:0 when the observer didn't fire.
  const headingRef = useReveal<HTMLHeadingElement>();

  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-xl bg-surface text-fg overflow-hidden"
    >
      <style>{`
        @keyframes features-marquee-track {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .features-marquee-track {
          animation: features-marquee-track ${durationSec}s linear infinite;
          animation-direction: ${animDirection};
        }
        ${pauseOnHover ? `.features-marquee-track:hover { animation-play-state: paused; }` : ""}
        @media (prefers-reduced-motion: reduce) {
          .features-marquee-track { animation: none; }
        }
      `}</style>

      {/* Header — constrained inside SectionGrid; alignment editor-driven. */}
      {showHeader ? (
      <SectionGrid>
        <div
          className={`col-span-12 mb-16 flex flex-col gap-6 md:mb-20 ${
            headerAlign === "left"
              ? "mr-auto items-start text-left"
              : headerAlign === "right"
                ? "ml-auto items-end text-right"
                : "mx-auto items-center text-center"
          }`}
          style={{ maxWidth: "690px" }}
        >
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-label-small font-mono uppercase text-fg"
            style={{ letterSpacing: "1px" }}
          >
            {eyebrow}
          </span>
          <h2
            ref={headingRef}
            data-mr-reveal
            className="text-heading-1 md:text-heading-0 text-fg font-display"
          >
            {heading}
          </h2>
        </div>
      </SectionGrid>
      ) : null}

      {/* Marquee — full-width, breaks out of the SectionGrid container.
       *  Each card carries its OWN trailing gap (marginRight: gapPx),
       *  including the last card of each set. The two sets sit flush
       *  against each other (no parent gap). This makes the rendered
       *  pattern fully periodic — every card occupies (cardWidth +
       *  gapPx) of horizontal space — so the keyframe's `-50%`
       *  translate lands set 2's first card exactly where set 1's was,
       *  with a seam gap identical to every other inter-card gap. */}
      <div className="overflow-hidden py-2">
        <div className="features-marquee-track flex w-max">
          {[0, 1].map((setIdx) => (
            <div
              key={setIdx}
              className="flex flex-none flex-row"
              aria-hidden={setIdx === 1 ? "true" : undefined}
            >
              {items.map((item, i) => (
                <ImageCard
                  key={`${setIdx}-${i}`}
                  item={item}
                  widthPx={widthPx}
                  heightPx={heightPx}
                  radiusPx={radiusPx}
                  parallaxPx={parallax}
                  showLabels={showLabels}
                  trailingGapPx={gapPx}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default FeaturesMarquee;
