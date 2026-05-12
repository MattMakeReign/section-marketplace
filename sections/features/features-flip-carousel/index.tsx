"use client";

import * as React from "react";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type FlipItem = {
  title: string;
  icon: React.ReactNode;
  body: string;
  link?: { label: string; href: string };
};

export type FeaturesFlipCarouselProps = {
  position?: number;
  eyebrow?: string;
  heading?: string;
  items?: FlipItem[];
};

const DEFAULT_ITEMS: FlipItem[] = [
  {
    title: "Strategy first.",
    icon: <IconStrategy />,
    body: "Every project starts with a written brief and a position. We don't move to design until the story is clear on the page.",
    link: { label: "How we work", href: "/services" },
  },
  {
    title: "Built to last.",
    icon: <IconAnchor />,
    body: "Sites that age slowly. Considered type, restrained motion, code we'd be happy to hand to another team in three years.",
    link: { label: "Recent work", href: "/work" },
  },
  {
    title: "One small team.",
    icon: <IconUsers />,
    body: "You work with the people doing the work. No layered account management, no relay across departments.",
    link: { label: "About the studio", href: "/about" },
  },
  {
    title: "Editorial craft.",
    icon: <IconBookmark />,
    body: "We bring a publication's sensibility — pacing, hierarchy, restraint — to commercial work that usually doesn't get it.",
    link: { label: "Read our notes", href: "/about" },
  },
  {
    title: "Long arcs.",
    icon: <IconCompass />,
    body: "Most engagements run multi-year. We'd rather know two clients well than chase ten new ones every quarter.",
    link: { label: "Get in touch", href: "/contact" },
  },
];

export function FeaturesFlipCarousel({
  position,
  eyebrow = "Principles",
  heading = "Five things the studio is built on.",
  items = DEFAULT_ITEMS,
}: FeaturesFlipCarouselProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    if (!card) return;
    const step = card.offsetWidth + 24; // card width + gap
    track.scrollBy({ left: step * dir, behavior: "smooth" });
  };

  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-xl bg-surface text-fg"
    >
      <SectionGrid>
        <div className="col-span-12 mb-12 flex items-baseline justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-label-large uppercase text-accent">
              {eyebrow}
            </p>
            <h2 className="text-heading-2 font-display max-w-[20ch] text-balance">
              {heading}
            </h2>
          </div>
          <p className="text-label-small text-fg-subtle font-mono hidden min-[48rem]:block whitespace-nowrap">
            {String(items.length).padStart(2, "0")} principles
          </p>
        </div>
      </SectionGrid>

      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory min-[48rem]:snap-proximity scroll-px-6 px-6 min-[48rem]:px-10 min-[64rem]:px-16 py-10 no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, idx) => (
          <FlipCard key={idx} item={item} />
        ))}
      </div>

      <SectionGrid>
        <div className="col-span-12 mt-12 flex items-center gap-4">
          <ArrowButton dir="prev" onClick={() => scrollByCard(-1)} />
          <ArrowButton dir="next" onClick={() => scrollByCard(1)} />
        </div>
      </SectionGrid>
    </Section>
  );
}

/* ── Card ────────────────────────────────────────────────────────── */

function FlipCard({ item }: { item: FlipItem }) {
  return (
    <article
      data-card
      className="
        group/flip
        snap-center shrink-0
        w-[min(85vw,22rem)]
        min-[48rem]:w-[min(56vw,24rem)]
        min-[64rem]:w-[min(30vw,22rem)]
        min-[80rem]:w-[22rem]
      "
      style={{ perspective: "1200px" }}
    >
      <div
        className="
          relative w-full
          h-[22rem] min-[48rem]:h-[24rem]
          rounded-lg
          transition-transform duration-[700ms] ease-out
          [transform-style:preserve-3d]
          group-hover/flip:[transform:rotateY(180deg)]
        "
      >
        {/* Front */}
        <div
          className="
            absolute inset-0 rounded-lg
            bg-surface-elevated border border-border/60
            p-8 min-[48rem]:p-10
            flex flex-col justify-between items-start
            [backface-visibility:hidden]
          "
        >
          <span className="text-accent" aria-hidden>
            {item.icon}
          </span>
          <h3 className="text-heading-4 font-display leading-[1.1] m-0">
            {item.title}
          </h3>
        </div>

        {/* Back */}
        <div
          className="
            absolute inset-0 rounded-lg
            bg-surface-inverse text-fg-inverse
            p-8 min-[48rem]:p-10
            flex flex-col justify-between items-start gap-6
            [backface-visibility:hidden] [transform:rotateY(180deg)]
          "
        >
          <p className="text-body-large leading-snug m-0 text-fg-inverse">{item.body}</p>
          {item.link && (
            <a
              href={item.link.href}
              className="
                inline-flex items-center gap-3
                text-label-large font-mono uppercase
                no-underline text-fg-inverse
                hover:opacity-80 transition-opacity
              "
            >
              <span
                className="
                  grid place-items-center
                  w-9 h-9 rounded-full
                  bg-accent text-accent-fg
                "
              >
                <ArrowRightTiny />
              </span>
              <span>{item.link.label}</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* ── Arrow nav ───────────────────────────────────────────────────── */

function ArrowButton({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous slide" : "Next slide"}
      className="
        w-14 h-14 rounded-full
        grid place-items-center
        bg-surface-elevated border border-border
        text-fg
        transition-transform duration-200 ease-out
        hover:scale-[1.04] hover:bg-accent hover:text-bg hover:border-accent
        active:scale-100
      "
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: dir === "prev" ? "rotate(180deg)" : undefined }}
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </button>
  );
}

/* ── Icons (inline, accent-colored via currentColor) ─────────────── */

function IconStrategy() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}
function IconAnchor() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V22" />
      <path d="M5 15a7 7 0 0 0 14 0" />
      <path d="M3 15h4M17 15h4" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14h1.5A4.5 4.5 0 0 1 22 18.5" />
    </svg>
  );
}
function IconBookmark() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}
function ArrowRightTiny() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default FeaturesFlipCarousel;
