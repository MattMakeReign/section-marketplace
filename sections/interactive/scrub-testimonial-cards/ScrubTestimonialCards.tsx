"use client";

/**
 * ScrubTestimonialCards — pinned horizontal scrub with velocity-lag.
 *
 * Adapted from the madewithgsap.com mwg_087 reference.
 *
 * Mechanics:
 *   - The cards row is wider than the viewport. ScrollTrigger pins the
 *     section's inner container and scrubs the row horizontally by exactly
 *     its overflow distance.
 *   - A side ScrollTrigger PER CARD (with containerAnimation: scrollTween)
 *     fires onEnter / onEnterBack as each card's left edge crosses the right
 *     viewport edge — driving a fromTo on .card-content. The "from" xPercent
 *     equals the current scroll velocity × lagMultiplier, so fast scrolls
 *     produce a longer slide-in lag and slow scrolls feel snappier.
 *   - Velocity is tracked via a per-frame ticker that diffs the cards row's
 *     gsap-driven `x` between ticks.
 *
 * Layout:
 *   <section>             — relative, overflow hidden
 *     <div container>     — 100vh, pinned to viewport while in view
 *       <div cards>       — flex row, width: max-content, scrubbed by x
 *         <div card>      — 370px wide × aspect 0.75
 *           <div content> — coloured background, holds quote + author
 *         ...
 *
 * The huge left/right padding on .cards (100vw + 1px on each side) gives
 * the first card a lead-in from off-screen right and the last card a
 * lead-out past off-screen left — so cards enter / exit feels even.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SECTION_ID = "scrub-testimonial-cards";

export type TestimonialCard = {
  id: string;
  quote: string;
  name: string;
  role: string;
  company?: string;
  avatar: { src: string; filename?: string };
  alt?: string;
};

export type ScrubTestimonialCardsProps = {
  items?: TestimonialCard[];
  /** Page background tone. */
  background?: "dark" | "light";
  /** Card width on desktop (px). */
  cardWidthPx?: number;
  /** Card width as % of viewport width on ≤ 768px. */
  cardWidthVwMobile?: number;
  /** Card aspect ratio (width / height). e.g. 0.75 → taller-than-wide. */
  cardAspectRatio?: number;
  /** Card corner radius (px). */
  cardRadiusPx?: number;
  /** Gap between cards (px). */
  cardGapPx?: number;
  /** Card inner padding (px). */
  cardPaddingPx?: number;
  /** Quote font size (px). */
  quoteFontSizePx?: number;
  /** Four-colour palette cycled every 4 cards (nth-child(4n)). */
  palette?: [string, string, string, string];
  /** Multiplier on scroll velocity for the lag-in slide. Higher = more drama. */
  lagMultiplier?: number;
  /** Duration of the lag-in slide tween (s). */
  lagDurationSec?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<ScrubTestimonialCardsProps>;

export const DEFAULT_ITEMS: TestimonialCard[] = D.items;

// Relative luminance → pick black vs white text for contrast.
function pickTextColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#0A0A0B";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  return L > 0.5 ? "#0A0A0B" : "#F1F1F1";
}

export function ScrubTestimonialCards({
  items = D.items,
  background = D.background,
  cardWidthPx = D.cardWidthPx,
  cardWidthVwMobile = D.cardWidthVwMobile,
  cardAspectRatio = D.cardAspectRatio,
  cardRadiusPx = D.cardRadiusPx,
  cardGapPx = D.cardGapPx,
  cardPaddingPx = D.cardPaddingPx,
  quoteFontSizePx = D.quoteFontSizePx,
  palette = D.palette,
  lagMultiplier = D.lagMultiplier,
  lagDurationSec = D.lagDurationSec,
}: ScrubTestimonialCardsProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  // Live config for tunables that should NOT re-init the ScrollTriggers on drag.
  const cfgRef = useRef({ lagMultiplier, lagDurationSec });
  cfgRef.current = { lagMultiplier, lagDurationSec };

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    const cardsEl = cardsRef.current;
    if (!root || !container || !cardsEl) return;

    const cardEls = Array.from(cardsEl.querySelectorAll<HTMLDivElement>(".stc-card"));
    if (cardEls.length === 0) return;

    let alive = true;
    const triggers: ScrollTrigger[] = [];
    let scrollTween: gsap.core.Tween | undefined;
    let tickFn: gsap.TickerCallback | undefined;
    let tickerRunning = false;

    // Wait for avatar images to load — they affect card layout via flex height.
    const imgs = Array.from(cardsEl.querySelectorAll<HTMLImageElement>("img"));
    const allLoaded = Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );

    allLoaded.then(() => {
      if (!alive) return;

      const distance = cardsEl.clientWidth - window.innerWidth;
      if (distance <= 0) return;

      // Hint fade — plays the moment the section pins.
      if (hintRef.current) {
        gsap.to(hintRef.current, {
          autoAlpha: 0,
          duration: 0.2,
          scrollTrigger: {
            trigger: cardsEl,
            start: "top top",
            end: "top top-=1",
            toggleActions: "play none reverse none",
          },
        });
      }

      // Pinned horizontal scrub.
      scrollTween = gsap.to(cardsEl, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          pin: true,
          scrub: true,
          start: "top top",
          end: `+=${distance}`,
        },
      });
      if (scrollTween.scrollTrigger) triggers.push(scrollTween.scrollTrigger);

      // Velocity tracker — measures change in cards row x between gsap ticks.
      let transformBetweenTwoTicks = 0;
      let oldTransform = 0;
      tickFn = () => {
        const currentTransform = gsap.getProperty(cardsEl, "x") as number;
        transformBetweenTwoTicks = currentTransform - oldTransform;
        oldTransform = currentTransform;
      };

      // Per-card lag-in trigger. containerAnimation makes the trigger fire
      // based on horizontal progress through scrollTween, not vertical scroll.
      cardEls.forEach((card) => {
        const inner = card.firstElementChild as HTMLElement | null;
        if (!inner) return;
        const t = ScrollTrigger.create({
          trigger: card,
          containerAnimation: scrollTween!,
          start: "left 100%",
          end: "right 0%",
          onEnter: () => {
            gsap.fromTo(
              inner,
              { xPercent: -transformBetweenTwoTicks * cfgRef.current.lagMultiplier },
              { xPercent: 0, ease: "power3.out", duration: cfgRef.current.lagDurationSec },
            );
          },
          onEnterBack: () => {
            gsap.fromTo(
              inner,
              { xPercent: -transformBetweenTwoTicks * cfgRef.current.lagMultiplier },
              { xPercent: 0, ease: "power3.out", duration: cfgRef.current.lagDurationSec },
            );
          },
        });
        triggers.push(t);
      });

      // Add the velocity ticker immediately — onEnter doesn't fire for already-
      // active triggers (which is the case when the section is the first thing
      // on the page).
      gsap.ticker.add(tickFn);
      tickerRunning = true;

      // Pause / resume the velocity ticker as section enters / leaves viewport.
      const visTrigger = ScrollTrigger.create({
        trigger: root,
        onToggle: (self) => {
          if (!tickFn) return;
          if (self.isActive && !tickerRunning) {
            gsap.ticker.add(tickFn);
            tickerRunning = true;
          } else if (!self.isActive && tickerRunning) {
            gsap.ticker.remove(tickFn);
            tickerRunning = false;
          }
        },
      });
      triggers.push(visTrigger);

      ScrollTrigger.refresh();
    });

    return () => {
      alive = false;
      if (tickFn) gsap.ticker.remove(tickFn);
      triggers.forEach((t) => t.kill());
      scrollTween?.kill();
      // Reset card-row x so a remount doesn't inherit a stale transform.
      if (cardsEl) gsap.set(cardsEl, { clearProps: "transform" });
      cardEls.forEach((c) => {
        const inner = c.firstElementChild as HTMLElement | null;
        if (inner) gsap.set(inner, { clearProps: "transform" });
      });
    };
    // Re-init only when the card count or layout dimensions change. Lag knobs
    // and palette are live via cfgRef / inline styles.
  }, [items.length, cardWidthPx, cardWidthVwMobile, cardAspectRatio, cardGapPx, cardPaddingPx, quoteFontSizePx]);

  // Refresh ScrollTrigger when palette / card padding / radius change visually
  // but not structurally — sometimes layout reflows on these too.
  useEffect(() => {
    if (typeof window === "undefined") return;
    ScrollTrigger.refresh();
  }, [cardRadiusPx]);

  const sectionStyle: React.CSSProperties = {
    background: background === "dark" ? "var(--surface, #121212)" : "var(--surface-inverse, #fdfcfc)",
    color: background === "dark" ? "#F1F1F1" : "#0A0A0B",
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="stc-root relative w-full overflow-hidden"
      style={sectionStyle}
    >
      <div
        ref={containerRef}
        className="stc-container relative flex flex-col justify-center w-full overflow-hidden"
        style={{ height: "100vh" }}
      >
        <p
          ref={hintRef}
          className="stc-hint absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-medium pointer-events-none select-none z-10"
        >
          Scroll
        </p>
        <div
          ref={cardsRef}
          className="stc-cards flex"
          style={{
            width: "max-content",
            whiteSpace: "nowrap",
            gap: `${cardGapPx}px`,
            willChange: "transform",
            // 100vw left/right padding gives smooth lead-in and lead-out off-screen.
            paddingLeft: "calc(100vw + 1px)",
            paddingRight: "calc(100vw + 1px)",
          }}
        >
          {items.map((it, i) => {
            const bg = palette[i % 4] ?? palette[0];
            const fg = pickTextColor(bg);
            return (
              <div
                key={it.id}
                className="stc-card relative shrink-0"
                style={{
                  width: `${cardWidthPx}px`,
                  aspectRatio: cardAspectRatio,
                }}
              >
                <div
                  className="stc-card-content flex flex-col justify-between"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: `${cardRadiusPx}px`,
                    background: bg,
                    color: fg,
                    padding: `${cardPaddingPx}px`,
                    whiteSpace: "initial",
                    willChange: "transform",
                  }}
                >
                  <p
                    className="stc-card-quote"
                    style={{
                      fontSize: `${quoteFontSizePx}px`,
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                    }}
                  >
                    {it.quote}
                  </p>
                  <div className="stc-card-author flex items-center" style={{ gap: 15 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.avatar.src}
                      alt={it.alt ?? it.name}
                      draggable={false}
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: "cover",
                        borderRadius: "100%",
                        flexShrink: 0,
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                        fontWeight: 500,
                        fontSize: 11,
                        lineHeight: 1.4,
                        textTransform: "uppercase",
                      }}
                    >
                      {it.name}
                      <br />
                      {it.role}
                      {it.company ? (
                        <>
                          <br />
                          {it.company}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stc-root .stc-card { width: var(--stc-card-w-mobile) !important; }
          .stc-root .stc-card-content { padding: 20px !important; }
          .stc-root .stc-card-quote { font-size: 20px !important; }
        }
      `}</style>
      <style>{`.stc-root { --stc-card-w-mobile: ${cardWidthVwMobile}vw; }`}</style>
    </section>
  );
}
