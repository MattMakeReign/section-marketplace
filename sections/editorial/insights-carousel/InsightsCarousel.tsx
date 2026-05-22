"use client";

/**
 * InsightsCarousel — editorial article carousel.
 *
 * Layout:
 *   - Top row: eyebrow + Plex Serif headline (left), 'Learn more' link + two
 *     pill nav buttons (right). Below md they stack to a column.
 *   - Slider: horizontal track of tall image-led story cards. The track lives
 *     in a `relative` wrapper that paddings in from the left grid margin but
 *     deliberately overflows the viewport on the right, so partial cards
 *     bleed off the edge — signals "more content".
 *
 * Halden Miller flavour:
 *   - Parchment cream surface; midnight-ink type; mono uppercase eyebrow.
 *   - Plex Serif headline at heading-3 (40/44 desktop, heading-4 below md),
 *     italic emphasis ready.
 *   - Pill nav buttons: hairline charcoal border default, inverse on hover
 *     (charcoal fill, parchment glyph) — mirrors Halden's button voice.
 *   - Card image radius `rounded-cards-large` (16px) to match brand cards.
 *
 * Motion (canonical stack — `useReveal` from @mr/canonical-stack):
 *   - Header reveals as a single block on scroll-in.
 *   - Slider reveals as a single block on scroll-in (separate trigger so it
 *     fires when the row enters the viewport, not when the header does).
 *
 * Card width / image height adapt at breakpoints via CSS custom property
 * (`--card-w`) overridden in `max-md:` / `max-sm:` utility classes. The
 * slider's `transform: translateX()` reads the same variable via calc(), so
 * the slide step recalculates automatically when the viewport crosses a
 * breakpoint — no JS measurement needed.
 */

"use client";

import { useState } from "react";
import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

const SECTION_ID = "insights-carousel";
const assetUrl = (filename: string) => `/api/section-asset/${SECTION_ID}/${filename}`;

export type Slide = {
  image: string;
  filename: string;
  alt: string;
  title: string;
  body: string;
};

export const DEFAULT_SLIDES: Slide[] = [
  {
    filename: "01-colleagues.jpg",
    image: assetUrl("01-colleagues.jpg"),
    alt: "Two colleagues working together in front of a computer in a bright office.",
    title: "How pricing and narrative align",
    body: "When your words match your value, decisions move faster.",
  },
  {
    filename: "02-hallway.jpg",
    image: assetUrl("02-hallway.jpg"),
    alt: "People walking through a bright, modern hallway with wood floor and neutral decor.",
    title: "Designing onboarding that builds trust",
    body: "Start with structure, not surprises.",
  },
  {
    filename: "03-meeting.jpg",
    image: assetUrl("03-meeting.jpg"),
    alt: "People having a conversation in a sun-lit modern office lounge.",
    title: "Rewriting decks for better outcomes",
    body: "It's not what you show — it's how you show it.",
  },
];

// ───────────────────────────────────────────────────────────────
// Arrow icon — single SVG; the prev button rotates it 180° via CSS.
// ───────────────────────────────────────────────────────────────

function ArrowIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 12H19M19 12L12 5M19 12L12 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────
// Section
// ───────────────────────────────────────────────────────────────

export type InsightsCarouselProps = {
  position?: number;
  headlineAlign?: "left" | "center" | "right";
  /** Card width at desktop (px). */
  cardWidthPx?: number;
  /** Card image corner radius (px). */
  cardRadiusPx?: number;
  /** Gap between cards (px). */
  cardGapPx?: number;
  /** Slides — managed via MediaManager in editor.tsx. */
  slides?: Slide[];
};

export function InsightsCarousel({
  position,
  headlineAlign = "left",
  cardWidthPx = 480,
  cardRadiusPx = 12,
  cardGapPx = 24,
  slides: slidesProp,
}: InsightsCarouselProps = {}) {
  const slides = [...(slidesProp ?? DEFAULT_SLIDES), ...(slidesProp ?? DEFAULT_SLIDES)];
  const [slide, setSlide] = useState(0);
  // Cap the index so the LAST possible position leaves a comfortable
  // amount of card row visible (not just one card hanging off the left
  // edge). Conservative: stop two cards before the array end.
  const maxSlide = Math.max(0, slides.length - 2);

  // Canonical scroll-in reveal — header + slider each reveal once.
  const headerRef = useReveal<HTMLDivElement>();
  const sliderRef = useReveal<HTMLDivElement>();

  const handlePrev = () => setSlide((s) => Math.max(0, s - 1));
  const handleNext = () => setSlide((s) => Math.min(maxSlide, s + 1));

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg bg-surface overflow-hidden"
    >
      {/* Header row — lives inside SectionGrid so it tracks the standard
          editorial measure. Below md it stacks to a column. */}
      <SectionGrid>
        <div
          ref={headerRef}
          data-mr-reveal
          className="col-span-12 mb-16 flex flex-row items-end justify-between gap-8 max-md:mb-12 max-md:flex-col max-md:items-start max-md:gap-6"
        >
          <div className={`flex max-w-[42.5rem] flex-1 flex-col gap-6 max-md:gap-4 ${
            headlineAlign === "center" ? "items-center text-center mx-auto"
            : headlineAlign === "right" ? "items-end text-right ml-auto"
            : "items-start text-left"
          }`}>
            <div
              className="inline-flex w-fit items-center justify-center rounded-tags px-2 py-1"
              style={{ backgroundColor: "var(--color-pressed-linen)" }}
            >
              <span
                className="text-label-small font-mono uppercase tracking-wider"
                style={{ color: "var(--fg)" }}
              >
                We are Halden + Miller
              </span>
            </div>

            <h2 className="m-0 text-heading-3 font-display text-fg max-md:text-heading-4">
              Quick reads, deeper thinking — drawn from the work,{" "}
              <em>not from theory</em>.
            </h2>
          </div>

          {/* Right — Learn more + pill nav buttons */}
          <div className="flex flex-shrink-0 flex-row items-center gap-3 pb-1 max-md:pb-0">
            <a
              href="#"
              className="text-button-large font-body relative inline-flex items-center gap-2 text-fg underline decoration-1 underline-offset-4 transition-opacity duration-base ease-standard hover:opacity-80"
            >
              Learn more
            </a>

            <button
              type="button"
              onClick={handlePrev}
              disabled={slide === 0}
              aria-label="Previous slide"
              data-insights-nav
              className="inline-flex items-center justify-center rounded-buttons-pill px-4 py-3 transition-colors duration-base ease-standard disabled:cursor-not-allowed disabled:opacity-40 max-md:px-3 max-md:py-[10px]"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--color-midnight-ink) 16%, transparent)",
                backgroundColor: "transparent",
                color: "var(--color-midnight-ink)",
              }}
            >
              <span className="block h-5 w-5 rotate-180">
                <ArrowIcon />
              </span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={slide === maxSlide}
              aria-label="Next slide"
              data-insights-nav
              className="inline-flex items-center justify-center rounded-buttons-pill px-4 py-3 transition-colors duration-base ease-standard disabled:cursor-not-allowed disabled:opacity-40 max-md:px-3 max-md:py-[10px]"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--color-midnight-ink) 16%, transparent)",
                backgroundColor: "transparent",
                color: "var(--color-midnight-ink)",
              }}
            >
              <span className="block h-5 w-5">
                <ArrowIcon />
              </span>
            </button>
          </div>
        </div>
      </SectionGrid>

      {/* Scoped CSS:
          - Pill nav hover → inverse fill (charcoal bg, parchment glyph).
            Done in scoped CSS instead of Tailwind utilities so the colour
            tokens stay readable and the disabled state can opt-out.
          - --card-w sets the card width per breakpoint; the track transform
            reads it via calc(). One source of truth. */}
      <style>{`
        [data-insights-nav]:not(:disabled):hover {
          background-color: var(--color-midnight-ink) !important;
          color: var(--color-parchment-cream) !important;
          border-color: var(--color-midnight-ink) !important;
        }
        [data-insights-track-wrap] {
          --card-w: ${cardWidthPx}px;
          --card-gap: ${cardGapPx}px;
        }
        @media (max-width: 767px) {
          [data-insights-track-wrap] {
            --card-w: ${Math.min(cardWidthPx, 360)}px;
            --card-gap: ${Math.min(cardGapPx, 12)}px;
          }
        }
        @media (max-width: 479px) {
          [data-insights-track-wrap] {
            --card-w: ${Math.min(cardWidthPx, 300)}px;
          }
        }
      `}</style>

      {/* Slider — lives OUTSIDE the SectionGrid so the right edge can
          bleed past the viewport. Left padding tracks the standard grid
          left margin so the first card lines up with grid content. */}
      <div
        ref={sliderRef}
        data-mr-reveal
        data-insights-track-wrap
        className="relative w-full"
        style={{
          paddingLeft: "max(var(--grid-margin, 24px), calc((100vw - var(--grid-max, 1440px)) / 2 + var(--grid-margin, 24px)))",
        }}
      >
        <div
          className="flex flex-row"
          style={{
            transform:
              "translateX(calc(var(--insights-slide, 0) * -1 * (var(--card-w) + var(--card-gap))))",
            transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
            // expose the slide index to CSS via custom property so the
            // transform recalculates whenever React updates the inline style
            ["--insights-slide" as string]: String(slide),
          }}
        >
          {slides.map((s, i) => (
            <article
              key={i}
              className="flex flex-shrink-0 flex-col gap-4 max-md:gap-3"
              style={{
                width: "var(--card-w)",
                marginRight: "var(--card-gap)",
              }}
            >
              <div
                className="relative w-full overflow-hidden"
                style={{ borderRadius: cardRadiusPx }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt={s.alt}
                  loading="lazy"
                  className="h-[400px] w-full object-cover max-lg:h-[340px] max-md:h-[280px] max-sm:h-[220px]"
                />
              </div>
              <div className="flex flex-col gap-2 pr-2">
                <h3
                  className="m-0 text-body-large font-display text-fg max-md:text-body-medium"
                >
                  {s.title}
                </h3>
                <p
                  className="m-0 text-body-small"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-midnight-ink) 64%, transparent)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {s.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}