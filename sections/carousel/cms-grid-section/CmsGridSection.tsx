"use client";

/**
 * CmsGridSection — Monolith property-listings carousel.
 *
 * Centered header (label, display headline, pill CTA) above a landscape-card
 * carousel. The active card sits centred in the viewport; its neighbours
 * drift off both edges. Prev/Next translate the track by one card-step with
 * a smooth ease-out transition. Side cards are dimmed.
 *
 * Infinite rotation: the slide list is rendered three times back-to-back.
 * The track starts in the middle copy, and whenever the active index leaves
 * that range the track silently snaps back to the equivalent position in the
 * middle copy after the transition completes. Because the snap target shows
 * the same content at the same viewport position, the jump is invisible.
 *
 * Styled against this project's tokens — see design-system/tokens.css. When
 * submitted to the Section Library, the brand-context capture bundles those
 * tokens so the marketplace `/render/[id]` page renders this section against
 * the same Monolith palette.
 */

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Section } from "@/components/section";
import manifest from "./section.json";
// Side-effect import guarantees ScrollTrigger is registered at module scope.
import "@/design-system/motion";
import { gsap } from "gsap";

type Property = {
  id: number;
  category: string;
  name: string;
  price: string;
  location: string;
  bedrooms: string;
  area: string;
  image: string;
};

// Picsum seeded URLs — landscape orientation for the new card aspect.
const seed = (key: string, w = 1600, h = 1200) =>
  `https://picsum.photos/seed/monolith-${key}/${w}/${h}`;

const slides: Property[] = [
  {
    id: 1,
    category: "For Sale",
    name: "Serenity Villas",
    price: "$300,000",
    location: "Maple Drive 45, New York",
    bedrooms: "4",
    area: "950",
    image: seed("villa-1"),
  },
  {
    id: 2,
    category: "For Sale",
    name: "Pollock Apartments",
    price: "$420,000",
    location: "Elmwood Avenue 12, Brooklyn",
    bedrooms: "3",
    area: "780",
    image: seed("pollock-2"),
  },
  {
    id: 3,
    category: "For Sale",
    name: "Urban Oasis",
    price: "$525,000",
    location: "Birch Street 88, Queens",
    bedrooms: "5",
    area: "1,120",
    image: seed("oasis-3"),
  },
  {
    id: 4,
    category: "For Sale",
    name: "Northbank Loft",
    price: "$610,000",
    location: "River Walk 09, Manhattan",
    bedrooms: "2",
    area: "880",
    image: seed("northbank-4"),
  },
  {
    id: 5,
    category: "For Sale",
    name: "Heron Pavilion",
    price: "$745,000",
    location: "Cedar Lane 31, Hudson Valley",
    bedrooms: "4",
    area: "1,340",
    image: seed("heron-5"),
  },
  {
    id: 6,
    category: "For Sale",
    name: "Atlas Residences",
    price: "$390,000",
    location: "Park Place 02, Boston",
    bedrooms: "3",
    area: "920",
    image: seed("atlas-6"),
  },
];

// ─────────────────────────────────────────────────────────────
// Inline icons
// ─────────────────────────────────────────────────────────────

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M16 8L2 8" stroke="currentColor" strokeWidth="2" />
      <path d="M9 15L2 8L9 1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M0 8H14" stroke="currentColor" strokeWidth="2" />
      <path d="M7 1L14 8L7 15" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconArrowChevron({ className }: { className?: string }) {
  return (
    <svg width="7" height="10" viewBox="0 0 7 10" fill="none" className={className} aria-hidden>
      <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconBed({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M1 11V4M1 11H15M1 11V13M15 11V13M15 11V8C15 6.89543 14.1046 6 13 6H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      <path d="M4 8C4.55228 8 5 7.55228 5 7C5 6.44772 4.55228 6 4 6C3.44772 6 3 6.44772 3 7C3 7.55228 3.44772 8 4 8Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconArea({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M2 2H14V14H2V2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6L6 2M2 10L10 2M2 14L14 2M6 14L14 6M10 14L14 10" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Property card — landscape, image-filled, rounded, info overlay at bottom
// ─────────────────────────────────────────────────────────────

function PropertyCard({ slide, active }: { slide: Property; active: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative overflow-hidden rounded-2xl w-full aspect-[4/3] transition-opacity duration-500 ease-out"
      style={{ opacity: active ? 1 : 0.35 }}
      onMouseEnter={() => active && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden={!active}
    >
      <img
        src={slide.image}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute top-4 left-4 z-10 backdrop-blur-md bg-black/40 px-2 py-1 rounded-sm">
        <div className="text-fg font-sans text-[var(--text-label-large)] font-semibold uppercase tracking-wide leading-4">
          {slide.category}
        </div>
      </div>

      <div
        className="absolute left-0 right-0 bottom-0 z-[1] h-2/3 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.92), rgba(0,0,0,0.45) 40%, transparent 75%)",
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 z-[2] px-6 pb-6 max-sm:px-4 max-sm:pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 h-6">
            <div className="flex items-center gap-2 text-fg">
              <IconBed />
              <div className="flex gap-1 font-sans text-[10px] font-semibold uppercase tracking-wide leading-3">
                <span>{slide.bedrooms}</span>
                <span>Bedrooms</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-fg">
              <IconArea />
              <div className="flex gap-1 font-sans text-[10px] font-semibold uppercase tracking-wide leading-3">
                <span>{slide.area}</span>
                <span>ft²</span>
              </div>
            </div>
          </div>

          <div className="text-fg font-wide text-2xl max-sm:text-base font-extrabold uppercase tracking-tight leading-[1.2]">
            {slide.name}
          </div>

          <div className="flex items-center gap-2 text-fg flex-wrap">
            <span className="font-sans text-base max-sm:text-xs">{slide.price}</span>
            <span className="font-sans text-base max-sm:text-xs opacity-60">·</span>
            <span className="font-serif text-base max-sm:text-xs">{slide.location}</span>
          </div>

          <div
            className="overflow-hidden transition-all duration-300"
            style={{ height: hovered ? "24px" : "0px" }}
          >
            <a href="#" className="text-fg underline font-sans text-sm max-sm:text-xs">
              View property
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section root — infinite translate-track carousel
// ─────────────────────────────────────────────────────────────

const COPIES = 3; // slide list rendered N × COPIES times for buffer
const TRANSITION_MS = 700;

export function CmsGridSection({ position }: { position?: number }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [btnHovered, setBtnHovered] = useState(false);

  const N = slides.length;
  const middleStart = N;             // first index of the middle copy
  const middleEnd = N * 2 - 1;       // last  index of the middle copy

  const renderedSlides = useMemo(
    () =>
      Array.from({ length: N * COPIES }, (_, i) => ({
        slide: slides[i % N],
        renderIdx: i,
      })),
    [N],
  );

  const [activeIdx, setActiveIdx] = useState(middleStart);
  const [animateSlide, setAnimateSlide] = useState(true);
  const [stepPx, setStepPx] = useState(0);
  const [cardW, setCardW] = useState(0);
  const [viewportW, setViewportW] = useState(0);

  // Measure the per-card step (card width + flex gap) and the viewport width
  // so we can centre the active card.
  useLayoutEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      const card = trackRef.current.firstElementChild as HTMLElement | null;
      if (!card) return;
      const gapPx = parseFloat(getComputedStyle(trackRef.current).gap) || 0;
      setCardW(card.offsetWidth);
      setStepPx(card.offsetWidth + gapPx);
      setViewportW(window.innerWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Silent snap-back to the middle copy whenever the active index leaves it.
  // Runs after the transition has played, so the user sees the slide animate
  // out, then the track jumps to the equivalent middle-copy index (same
  // content at the same viewport position — invisible).
  useEffect(() => {
    if (activeIdx >= middleStart && activeIdx <= middleEnd) return;
    const snapTimer = window.setTimeout(() => {
      setAnimateSlide(false);
      setActiveIdx((prev) => {
        const phase = ((prev - middleStart) % N + N) % N;
        return middleStart + phase;
      });
    }, TRANSITION_MS + 30);
    return () => clearTimeout(snapTimer);
  }, [activeIdx, middleStart, middleEnd, N]);

  // Entrance reveal — header + slider rise + fade in via GSAP ScrollTrigger.
  useEffect(() => {
    const header = headerRef.current;
    const slider = sliderRef.current;
    if (!header || !slider) return;

    const ctx = gsap.context(() => {
      gsap.from([header, slider], {
        opacity: 0,
        y: 32,
        duration: 0.7,
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        stagger: 0.12,
        scrollTrigger: {
          trigger: header,
          start: "top 90%",
          once: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  const tx = stepPx > 0 ? viewportW / 2 - activeIdx * stepPx - cardW / 2 : 0;
  const measured = stepPx > 0;

  const handlePrev = () => {
    setAnimateSlide(true);
    setActiveIdx((i) => i - 1);
  };
  const handleNext = () => {
    setAnimateSlide(true);
    setActiveIdx((i) => i + 1);
  };

  const gridBg = useMemo<CSSProperties>(
    () => ({
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
      backgroundSize: "64px 64px",
      backgroundPosition: "0 0",
    }),
    [],
  );

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="relative overflow-hidden bg-surface text-fg pt-24 pb-section-xl max-lg:pt-16 max-lg:pb-16 max-sm:pt-12 max-sm:pb-12"
    >
      <div className="absolute inset-0 pointer-events-none" style={gridBg} />

      {/* Header */}
      <div className="relative z-[2] w-full max-w-[var(--grid-max)] mx-auto px-8 max-sm:px-4">
        <div
          ref={headerRef}
          className="flex flex-col items-center text-center gap-6 max-w-[var(--header-max)] max-lg:max-w-[28rem] mx-auto mb-16 max-sm:mb-12"
        >
          <div className="flex flex-col gap-4">
            <div className="text-fg font-sans text-[var(--text-label-large)] font-semibold uppercase tracking-wide leading-4">
              For Sale
            </div>
            <h2 className="text-fg font-display text-heading-1 max-sm:text-[13vw]">
              Amazing new houses nearby
            </h2>
          </div>

          {/* CTA — paper pill with slide-up label */}
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full px-[var(--button-large-px)] py-[var(--button-large-py)] font-sans font-semibold text-base leading-[1.5] text-accent-fg bg-accent hover:bg-accent-hover cursor-pointer no-underline overflow-hidden transition-colors duration-fast ease-standard max-sm:text-sm max-sm:px-5 max-sm:py-2"
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            aria-label="Browse all listings"
          >
            <div className="h-6 overflow-hidden max-sm:h-auto">
              <div
                className="flex flex-col transition-transform duration-300 ease-out"
                style={{ transform: btnHovered ? "translateY(-100%)" : "translateY(0%)" }}
              >
                <div className="flex items-center gap-2 h-6">
                  <span>Browse all</span>
                  <span className="flex items-center justify-center max-sm:hidden">
                    <IconArrowChevron />
                  </span>
                </div>
                <div className="flex items-center gap-2 h-6">
                  <span>Browse all</span>
                  <span className="flex items-center justify-center max-sm:hidden">
                    <IconArrowChevron />
                  </span>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Slider — translate-track, overflow-hidden mask, full-bleed cards */}
      <div ref={sliderRef} className="relative w-full">
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-6 will-change-transform"
            style={{
              transform: `translateX(${tx}px)`,
              transition: measured && animateSlide
                ? `transform ${TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
                : "none",
              visibility: measured ? "visible" : "hidden",
            }}
          >
            {renderedSlides.map(({ slide, renderIdx }) => (
              <div
                key={renderIdx}
                className="flex-shrink-0 w-[64vw] max-w-[860px] max-lg:w-[78vw] max-sm:w-[88vw]"
              >
                <PropertyCard slide={slide} active={renderIdx === activeIdx} />
              </div>
            ))}
          </div>
        </div>

        {/* Outer nav arrows — page-level, pinned to section edges */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute top-1/2 -translate-y-1/2 z-10 rounded-full bg-accent text-accent-fg w-12 h-12 flex items-center justify-center transition-opacity duration-fast hover:opacity-80 left-6 max-lg:left-3"
          aria-label="Previous slide"
        >
          <IconArrowLeft />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="absolute top-1/2 -translate-y-1/2 z-10 rounded-full bg-accent text-accent-fg w-12 h-12 flex items-center justify-center transition-opacity duration-fast hover:opacity-80 right-6 max-lg:right-3"
          aria-label="Next slide"
        >
          <IconArrowRight />
        </button>
      </div>
    </Section>
  );
}

export default CmsGridSection;
