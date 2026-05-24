"use client";

/**
 * StackingCards — scroll-pinned editorial stats section.
 *
 * Layout: centered headline above a tall list of three image cards. Each
 * card uses `position: sticky` with a staggered top offset so they overlap
 * the previous card as the user scrolls — the visual is a deck of cards
 * being shuffled forward. A frosted-glass tile in the bottom-left of each
 * card carries a stat number + short caption.
 *
 * Halden Miller flavour:
 *   - Plex Serif headline at heading-2, italic-emphasis-ready.
 *   - Card radii follow `--radius-cards` (12px) by default; editor can override.
 *   - Tile is obsidian-tinted glass with a parchment-cream hairline outline.
 *   - Stat number in Plex Serif at heading-3 (32 / 36); caption in Plex Sans body-small.
 *
 * Motion:
 *   - Headline blurs in (12px → 0) + fades when scrolled into view via the
 *     canonical-stack `useReveal` hook.
 *   - Cards stack via CSS sticky — no JS scroll listener.
 *
 * Per workspace rules: NO third-party CDN URLs. Default images use
 * `picsum.photos` seeds; uploads go through the local agent into
 * `sections/stacking-cards/assets/` and are served by the section-asset
 * route at `/api/section-asset/stacking-cards/<file>` with cache-bust.
 */

import { useEffect, useRef } from "react";
import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

const SECTION_ID = "stacking-cards";

export type StackingCard = {
  /** URL the section renders. Asset-route URL once uploaded; picsum seed by default. */
  image: string;
  /** Filename inside `assets/` — used by the editor's MediaManager for uploads. */
  filename: string;
  alt: string;
  /** Big stat number, e.g. "20+". */
  stat: string;
  /** Caption under the stat. */
  caption: string;
};

export const DEFAULT_CARDS: StackingCard[] = [
  {
    image: "https://picsum.photos/seed/halden-stacking-1/1800/1200",
    filename: "01-statistic.jpg",
    alt: "Portrait of a person mid-conversation in soft daylight.",
    stat: "20+",
    caption: "Major transitions guided in the last 5 years.",
  },
  {
    image: "https://picsum.photos/seed/halden-stacking-2/1800/1200",
    filename: "02-meeting.jpg",
    alt: "Three colleagues in a modern office lounge.",
    stat: "200+",
    caption: "Executives coached for critical communication.",
  },
  {
    image: "https://picsum.photos/seed/halden-stacking-3/1800/1200",
    filename: "03-leadership.jpg",
    alt: "Editorial portrait of an executive in a board meeting.",
    stat: "12B+",
    caption: "Deal value supported through M&A communication.",
  },
];

export type StackingCardsProps = {
  position?: number;
  cards?: StackingCard[];
  headlineAlign?: "left" | "center" | "right";
  /** Card height as % of viewport (70 = 70vh — the original ref). */
  cardHeightVh?: number;
  /** Card corner radius (px). Defaults mirror `--radius-cards`. */
  cardRadiusPx?: number;
  /** Card inner padding (px). */
  cardPaddingPx?: number;
  /** Top sticky offset for the FIRST card (px). */
  baseTopPx?: number;
  /** How much each subsequent card's top offset increases (px). */
  stickyStaggerPx?: number;
  /** Gap between cards in the natural flow (px). */
  cardGapPx?: number;
  /** Inner tile (the frosted-glass stat box) padding (px). */
  tilePaddingPx?: number;
  /** Tile corner radius (px). */
  tileRadiusPx?: number;
  /** Headline-to-cards gap (px). */
  headlineGapPx?: number;
  /** Whether to render the gradient overlay on the first card. */
  showGradient?: boolean;
  /** How much each card scales down as the NEXT card stacks on top.
   *  0 disables. 0.04 = card scales to 0.96. 0.08 = card scales to 0.92. */
  scaleStep?: number;
  /** Width of the card stack in section-grid columns (out of 12).
   *  8 = centred narrow deck, 10 = roomier, 12 = full grid bleed. */
  gridSpan?: 8 | 10 | 12;
};

export function StackingCards({
  position,
  cards: cardsProp,
  headlineAlign = "center",
  cardHeightVh = 70,
  // Mirrors design-system `--radius-cards` (12px).
  cardRadiusPx = 12,
  cardPaddingPx = 32,
  baseTopPx = 120,
  stickyStaggerPx = 60,
  cardGapPx = 24,
  tilePaddingPx = 24,
  // Mirrors design-system `--radius-inputs` (8px).
  tileRadiusPx = 8,
  headlineGapPx = 120,
  showGradient = true,
  scaleStep = 0.04,
  gridSpan = 12,
}: StackingCardsProps = {}) {
  const cards = cardsProp ?? DEFAULT_CARDS;
  const headlineRef = useReveal<HTMLDivElement>();
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll-tied scale-down for the stacking effect. As each NEXT card
  // moves into its sticky slot, the card BENEATH it scales down (and lifts
  // slightly via translateY) to mimic the visual of physical cards being
  // shuffled to the back of the deck. Pure rAF loop — no GSAP, no
  // ScrollTrigger. Reads bounding rects every frame and assigns transform
  // inline. The last card never scales (no card stacks above it).
  useEffect(() => {
    if (scaleStep <= 0) return;
    let raf = 0;
    let alive = true;
    function tick() {
      if (!alive) return;
      const list = listRef.current;
      if (list) {
        const els = Array.from(
          list.querySelectorAll<HTMLElement>("[data-stacking-card]"),
        );
        const vh = window.innerHeight;
        // Pre-compute progress for every card (0 = not yet pinned, 1 = fully
        // pinned in its sticky slot). Each card[i] then sums the progress of
        // every card AHEAD of it (j > i) — the more cards stacked on top, the
        // further i is pushed back. Card 1 keeps scaling as cards 2 AND 3
        // arrive; card 2 scales as 3 arrives; card 3 (last) never scales.
        const progresses: number[] = els.map((_, j) => {
          const next = els[j];
          if (j === 0) return 0; // own progress isn't used; we read j>i
          const nextTop = next.getBoundingClientRect().top;
          const nextSticky = baseTopPx + j * stickyStaggerPx;
          const span = vh - nextSticky;
          return span > 0
            ? Math.max(0, Math.min(1, (vh - nextTop) / span))
            : 0;
        });
        els.forEach((el, i) => {
          let cumulative = 0;
          for (let j = i + 1; j < els.length; j++) {
            cumulative += progresses[j];
          }
          const scale = Math.max(0.5, 1 - cumulative * scaleStep);
          // Origin at top so the card's TOP edge stays pinned at its sticky
          // position and only the bottom + sides recede inward as cards
          // stack over it. No translateY — that would lift the card out of
          // its sticky slot and create a visible gap.
          el.style.transform = `scale(${scale})`;
          el.style.transformOrigin = "center top";
        });
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [baseTopPx, stickyStaggerPx, scaleStep, cards.length]);

  const alignClass =
    headlineAlign === "left"
      ? "items-start text-left"
      : headlineAlign === "right"
        ? "items-end text-right"
        : "items-center text-center mx-auto";

  // List container height = sum of card heights only. Earlier we padded
  // with extra runway per card, but that left ~30vh of "stuck" scroll
  // after the last card had already stacked — the section visually
  // froze while the user scrolled through dead space. Tight formula:
  // each card needs `cardHeightVh` of scroll to enter and land in its
  // sticky slot; after the last lands, the container ends and the page
  // resumes scrolling immediately.
  const listHeightVh = cards.length * cardHeightVh;

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-xl bg-surface text-fg"
    >
      <SectionGrid>
        <div
          ref={headlineRef}
          data-mr-reveal
          className={`col-span-12 flex max-w-[42.5rem] flex-col gap-6 max-md:gap-4 ${alignClass}`}
          style={{ marginBottom: headlineGapPx }}
        >
          <h2 className="m-0 text-heading-2 font-display text-fg max-md:text-heading-4">
            Beyond single projects, here's the impact our clients see when{" "}
            <em>communication holds</em>.
          </h2>
        </div>

        {/* Stack list — the column the sticky cards live inside. Its tall
         *  height (computed from card count × 80vh) is what gives sticky
         *  somewhere to slide through. Cards each carry their own staggered
         *  top offset so they stack as the user scrolls. */}
        <div
          ref={listRef}
          className={`mx-auto flex w-full flex-col ${
            gridSpan === 8
              ? "col-span-12 md:col-span-8 md:col-start-3"
              : gridSpan === 10
                ? "col-span-12 md:col-span-10 md:col-start-2"
                : "col-span-12"
          }`}
          style={{
            height: `${listHeightVh}vh`,
            gap: cardGapPx,
          }}
        >
          {cards.map((card, i) => (
            <article
              key={`${card.filename}-${i}`}
              data-stacking-card
              className="sticky flex w-full flex-col items-start justify-end overflow-hidden"
              style={{
                top: baseTopPx + i * stickyStaggerPx,
                height: `${cardHeightVh}vh`,
                padding: cardPaddingPx,
                borderRadius: cardRadiusPx,
                backgroundImage: `url("${card.image}")`,
                backgroundPosition: "50%",
                backgroundSize: "cover",
                willChange: "transform",
              }}
            >
              {/* Gradient overlay — sweetens the legibility of the tile
               *  against complex photographic backgrounds. Editor can hide. */}
              {showGradient ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[1]"
                  style={{
                    height: "40%",
                    backgroundImage:
                      "linear-gradient(0deg, color-mix(in srgb, var(--color-obsidian-shade) 64%, transparent), transparent)",
                  }}
                />
              ) : null}

              {/* Frosted-glass tile — stat + caption. Hairline outline uses
               *  parchment-cream at low opacity to read on dark imagery. */}
              <div
                className="relative z-[2] flex flex-col"
                style={{
                  padding: tilePaddingPx,
                  gap: 8,
                  borderRadius: tileRadiusPx,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  backgroundColor:
                    "color-mix(in srgb, var(--color-obsidian-shade) 32%, transparent)",
                  boxShadow:
                    "0 -1px 0 0 color-mix(in srgb, var(--color-parchment-cream) 16%, transparent), 0 1px 0 0 color-mix(in srgb, var(--color-parchment-cream) 8%, transparent)",
                  color:
                    "color-mix(in srgb, var(--color-parchment-cream) 88%, transparent)",
                }}
              >
                <div
                  className="m-0 text-heading-3 font-display max-md:text-heading-4"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-parchment-cream) 88%, transparent)",
                  }}
                >
                  {card.stat}
                </div>
                <div
                  className="m-0 text-body-small max-md:text-label-large"
                  style={{
                    fontFamily: "var(--font-body)",
                    color:
                      "color-mix(in srgb, var(--color-parchment-cream) 88%, transparent)",
                  }}
                >
                  {card.caption}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionGrid>
    </Section>
  );
}

export default StackingCards;
export { SECTION_ID as STACKING_CARDS_SECTION_ID };
