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
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export type FeaturesMarqueeItem = {
  src: string;
  srcSet?: string;
  alt?: string;
  labels: string[];
};

export type FeaturesMarqueeProps = {
  position?: number;
  eyebrow?: string;
  heading?: string;
  items?: FeaturesMarqueeItem[];
};

const DEFAULT_ITEMS: FeaturesMarqueeItem[] = [
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

function ImageCard({ item }: { item: FeaturesMarqueeItem }) {
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Scroll-tied parallax: image is 150% tall, shifts up to ~50% as the card
  // crosses the viewport. Lifts the marquee out of "static row of pictures".
  React.useEffect(() => {
    const onScroll = () => {
      const img = imgRef.current;
      if (!img) return;
      const parent = img.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const progress = -rect.top / window.innerHeight;
      img.style.transform = `translateY(calc(-10% + ${progress * 60}px))`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="features-marquee-card relative flex-none overflow-hidden rounded-2xl bg-surface-muted"
      style={{ width: 573, height: 680 }}
    >
      <img
        ref={imgRef}
        src={item.src}
        srcSet={item.srcSet}
        sizes="100vw"
        alt={item.alt ?? ""}
        loading="lazy"
        className="absolute inset-0 w-full object-cover"
        style={{ height: "150%", transform: "translateY(-10%)", zIndex: 1 }}
      />
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
    </div>
  );
}

export function FeaturesMarquee({
  position,
  eyebrow = "Featured",
  heading = "A few essentials.",
  items = DEFAULT_ITEMS,
}: FeaturesMarqueeProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const [headingVisible, setHeadingVisible] = React.useState(false);

  // Heading fade + rise when it enters the viewport. Single-shot.
  React.useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeadingVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
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
      <style>{`
        @keyframes features-marquee-track {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .features-marquee-track {
          animation: features-marquee-track 40s linear infinite;
        }
        @media (max-width: 991px) {
          .features-marquee-card { width: 380px !important; height: 480px !important; }
        }
        @media (max-width: 767px) {
          .features-marquee-card { width: 320px !important; height: 400px !important; }
        }
        @media (max-width: 479px) {
          .features-marquee-card { width: 280px !important; height: 320px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .features-marquee-track { animation: none; }
        }
      `}</style>

      {/* Header — constrained inside SectionGrid, centered */}
      <SectionGrid>
        <div
          className="col-span-12 mx-auto mb-16 flex flex-col items-center gap-6 text-center md:mb-20"
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
            className="text-heading-1 md:text-heading-0 text-fg font-display transition-all duration-700 ease-out"
            style={{
              opacity: headingVisible ? 1 : 0,
              transform: headingVisible ? "translateY(0)" : "translateY(32px)",
            }}
          >
            {heading}
          </h2>
        </div>
      </SectionGrid>

      {/* Marquee — full-width, breaks out of the SectionGrid container */}
      <div className="overflow-hidden py-2">
        <div
          className="features-marquee-track flex w-max"
          style={{ gap: "32px" }}
        >
          {[0, 1].map((setIdx) => (
            <div
              key={setIdx}
              className="flex flex-none flex-row"
              style={{ gap: "12px" }}
              aria-hidden={setIdx === 1 ? "true" : undefined}
            >
              {items.map((item, i) => (
                <ImageCard key={`${setIdx}-${i}`} item={item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default FeaturesMarquee;
