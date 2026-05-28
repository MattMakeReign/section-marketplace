"use client";

/**
 * DriftingCards — pinned horizontal scrub with per-card vertical drift.
 *
 * A single horizontal strip of cards pins to the viewport and slides
 * right→left as the user scrolls. Each card drifts vertically on a half-sine
 * yoyo as it traverses the viewport (odd cards drift down then up, even
 * cards up then down), and pulses to a peak scale at center with a soft
 * back.inOut ease. A small per-card rotation jitter flips sign across the
 * travel for a hand-tossed feel.
 *
 * Layout:
 *   <section>            — relative wrapper, overflow hidden
 *     <div container>    — pinned to viewport, holds the headline + strip
 *       <p>              — centered headline + greyed subhead
 *       <div strip>      — flex row, width: max-content, the scrub target
 *         <img/>...
 *       </div>
 *     </div>
 *   </section>
 *
 * Implementation notes:
 *   - Distance to scrub = strip.scrollWidth - window.innerWidth. The pinned
 *     ScrollTrigger uses end: '+=' + distance so the scroll distance is
 *     exactly the overflow, regardless of section/page height.
 *   - Per-card animations use `containerAnimation: scrollTween` so each
 *     card's trigger is evaluated against horizontal position inside the
 *     scrubbed strip, not vertical page scroll. Start/end of "left 90%" /
 *     "right 10%" means the drift fires from just-entering-viewport through
 *     to almost-leaving.
 *   - Wait for all images to load before measuring strip width — image
 *     dimensions drive max-content width and stale measurements break the
 *     scrub distance.
 *   - Lenis smooth-scroll is provided centrally by the project's
 *     MotionProvider — no per-section wiring needed.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SECTION_ID = "drifting-cards";

export type DriftingCardItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type DriftingCardsProps = {
  items?: DriftingCardItem[];
  /** Headline shown centered in the pinned viewport. */
  headline?: string;
  /** Subhead, rendered greyed-out beneath the headline. */
  subhead?: string;
  /** Card width on desktop, in vw. */
  cardWidthVw?: number;
  /** Card width on mobile (≤768px), in vw. */
  cardWidthVwMobile?: number;
  /** Gap between cards, in vw. */
  cardGapVw?: number;
  /** Card corner radius, in px. Defaults to the project's --radius-lg token
   *  (10px in this DS, treated as the canonical "card" radius). */
  cardRadiusPx?: number;
  /** Horizontal padding either side of the strip, in vw. Drives how far
   *  past the centerline the first/last cards sit at scroll = 0 / 1. */
  edgePaddingVw?: number;
  /** Section tone. */
  background?: "dark" | "light";
  /** Headline font size, in vh. */
  headlineSizeVh?: number;
  /** Vertical drift amplitude as a fraction of viewport height (desktop). */
  driftAmplitude?: number;
  /** Vertical drift amplitude as a fraction of viewport height (mobile). */
  driftAmplitudeMobile?: number;
  /** Peak scale at center of travel. 1 = no pulse. */
  scalePeak?: number;
  /** Maximum random rotation, in degrees. Each card picks a value in
   *  ±rotationJitterDeg and flips sign across its travel. */
  rotationJitterDeg?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<DriftingCardsProps>;

export const DEFAULT_ITEMS: DriftingCardItem[] = D.items;

export function DriftingCards({
  items = D.items,
  headline = D.headline,
  subhead = D.subhead,
  cardWidthVw = D.cardWidthVw,
  cardWidthVwMobile = D.cardWidthVwMobile,
  cardGapVw = D.cardGapVw,
  cardRadiusPx = D.cardRadiusPx,
  edgePaddingVw = D.edgePaddingVw,
  background = D.background,
  headlineSizeVh = D.headlineSizeVh,
  driftAmplitude = D.driftAmplitude,
  driftAmplitudeMobile = D.driftAmplitudeMobile,
  scalePeak = D.scalePeak,
  rotationJitterDeg = D.rotationJitterDeg,
}: DriftingCardsProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    const strip = stripRef.current;
    if (!root || !container || !strip) return;

    const cards = Array.from(strip.querySelectorAll<HTMLImageElement>("img.dc-card"));
    if (cards.length === 0) return;

    let scrollTween: gsap.core.Tween | undefined;
    const cardTweens: gsap.core.Tween[] = [];
    let alive = true;

    const allLoaded = Promise.all(
      cards.map((img) =>
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

      const distance = strip.scrollWidth - window.innerWidth;
      if (distance <= 0) return;
      const isPortrait = window.innerWidth < window.innerHeight;
      const amplitude = isPortrait ? driftAmplitudeMobile : driftAmplitude;

      // Master horizontal scrub: pin the container, slide the strip the
      // full overflow distance over a scroll equal to that distance.
      scrollTween = gsap.to(strip, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          pin: true,
          scrub: true,
          start: "top top",
          end: "+=" + distance,
        },
      });

      cards.forEach((card, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        const rotation = (Math.random() - 0.5) * (rotationJitterDeg * 2);

        // Drift + rotation flip across the card's horizontal travel.
        cardTweens.push(
          gsap.fromTo(
            card,
            { rotation },
            {
              rotation: -rotation,
              y: () => sign * -amplitude * window.innerHeight,
              yPercent: () => sign * 50,
              yoyo: true,
              repeat: 1,
              ease: "power1.inOut",
              scrollTrigger: {
                trigger: card,
                containerAnimation: scrollTween,
                start: "left 90%",
                end: "right 10%",
                scrub: true,
              },
            },
          ),
        );

        // Scale pulse — back.inOut(3) snaps in at center then snaps back.
        cardTweens.push(
          gsap.to(card, {
            scale: scalePeak,
            yoyo: true,
            repeat: 1,
            ease: "back.inOut(3)",
            scrollTrigger: {
              trigger: card,
              containerAnimation: scrollTween,
              start: "left 90%",
              end: "right 10%",
              scrub: true,
            },
          }),
        );
      });

      ScrollTrigger.refresh();
    });

    return () => {
      alive = false;
      scrollTween?.scrollTrigger?.kill();
      scrollTween?.kill();
      cardTweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
      cards.forEach((c) => gsap.set(c, { clearProps: "transform" }));
      gsap.set(strip, { clearProps: "transform" });
    };
  }, [
    items.length,
    cardWidthVw,
    cardWidthVwMobile,
    cardGapVw,
    cardRadiusPx,
    edgePaddingVw,
    driftAmplitude,
    driftAmplitudeMobile,
    scalePeak,
    rotationJitterDeg,
  ]);

  const sectionStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    /* Tone flips between the project's surface tokens, NOT hardcoded
     * hex values. Pulled into a project with a different palette, the
     * section adapts automatically. */
    background:
      background === "dark" ? "var(--surface)" : "var(--surface-inverse)",
    color: background === "dark" ? "var(--fg)" : "var(--fg-inverse)",
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="dc-root w-full"
      style={sectionStyle}
    >
      <div
        ref={containerRef}
        className="dc-container relative flex flex-col justify-center w-full"
        style={{ height: "100vh" }}
      >
        {(headline || subhead) && (
          <p
            className="dc-headline absolute left-1/2 top-1/2 text-center"
            style={{
              transform: "translate(-50%, -50%)",
              /* Size remains designer-controlled in vh (the section's
               * pinned-frame nature wants it to scale with viewport height,
               * not the role's clamp ladder). Everything else is sourced
               * from the project's "heading-1" type role so font-family,
               * weight, line-height and tracking inherit from the DS. */
              fontSize: `${headlineSizeVh}vh`,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--text-heading-1--font-weight)" as unknown as number,
              lineHeight: "var(--text-heading-1--line-height)",
              letterSpacing: "var(--text-heading-1--letter-spacing)",
              color: "var(--fg)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {headline}
            {headline && subhead ? <br /> : null}
            {subhead ? (
              <span style={{ color: "var(--fg-muted)" }}>{subhead}</span>
            ) : null}
          </p>
        )}

        <div
          ref={stripRef}
          className="dc-strip flex items-center"
          style={{
            width: "max-content",
            whiteSpace: "nowrap",
            gap: `${cardGapVw}vw`,
            padding: `0 ${edgePaddingVw}vw`,
            willChange: "transform",
          }}
        >
          {items.map((it) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={it.id}
              src={it.src}
              alt={it.alt ?? ""}
              className="dc-card"
              draggable={false}
              style={{
                position: "relative",
                width: `min(${cardWidthVw}vw, 100%)`,
                height: "auto",
                display: "block",
                borderRadius: `${cardRadiusPx}px`,
                maxWidth: "none",
                userSelect: "none",
                WebkitUserDrag: "none",
                /* Mobile sizing handled via inline @media isn't possible;
                 * use a CSS custom property + clamp instead. */
                ["--dc-card-w" as string]: `${cardWidthVw}vw`,
                ["--dc-card-w-mobile" as string]: `${cardWidthVwMobile}vw`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Scoped responsive override — kept inline so the section ships
       *  self-contained without leaking selectors into globals.css. */}
      <style>{`
        @media (max-width: 768px) {
          [data-section-id="drifting-cards"] .dc-card {
            width: var(--dc-card-w-mobile) !important;
          }
        }
      `}</style>
    </section>
  );
}
