/**
 * PricingThreeTier — centered editorial headline above three pricing cards
 * (two light on Pressed Linen, one dark on Obsidian Shade) with mono eyebrow
 * strips on each tier and a guidance CTA bar with avatar cluster below.
 *
 * Halden Miller flavour:
 *   - Plex Serif headline at 48px (text-heading-2), italic-emphasis-ready.
 *   - Plex Sans body, Plex Mono uppercase labels with 0.75px tracking.
 *   - Charcoal pill buttons (cased, not uppercase) on light cards;
 *     inverted parchment pill on the dark card.
 *   - Surface tone for elevation — no drop shadows. Hairline borders only.
 */

"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ───────────────────────────────────────────────────────────────
// Inline icons (stroke-based, currentColor)
// ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M13.3307 4L5.9974 11.3333L2.66406 8"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.33337 8.00016H12.6667M12.6667 8.00016L8.00004 3.3335M12.6667 8.00016L8.00004 12.6668"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────
// Buttons
// ───────────────────────────────────────────────────────────────

type PillButtonProps = {
  label: string;
  variant?: "primary" | "inverse";
  className?: string;
};

/**
 * PillButton — Halden Miller signature soft pill.
 * `primary` (default): charcoal fill, parchment text. Use on light surfaces.
 * `inverse`: parchment fill, charcoal text. Use on dark surfaces.
 */
function PillButton({ label, variant = "primary", className = "" }: PillButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isInverse = variant === "inverse";

  return (
    <a
      href="#"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`btn relative inline-flex items-center justify-center gap-2 rounded-buttons px-4 py-3 text-button-large no-underline transition-colors duration-base ease-standard ${className}`}
      style={{
        color: isInverse ? "var(--color-midnight-ink)" : "var(--color-parchment-cream)",
        backgroundColor: hovered
          ? isInverse
            ? "color-mix(in srgb, var(--color-parchment-cream) 88%, transparent)"
            : "color-mix(in srgb, var(--color-midnight-ink) 88%, transparent)"
          : isInverse
            ? "var(--color-parchment-cream)"
            : "var(--color-midnight-ink)",
        borderColor: isInverse
          ? "color-mix(in srgb, var(--color-midnight-ink) 8%, transparent)"
          : "color-mix(in srgb, var(--color-parchment-cream) 8%, transparent)",
        borderWidth: 1,
        borderStyle: "solid",
        boxShadow: "var(--shadow-button-bevel)",
      }}
    >
      {/* Label mask animation — outgoing label translates up, aria-hidden
       * duplicate translates up from below into view. Both clipped by .btn's
       * overflow:hidden. Pattern lives in design-system/components.css. */}
      <span className="btn-label-stack">
        <span className="btn-label">{label}</span>
        <span className="btn-label-hover" aria-hidden>{label}</span>
      </span>
      <span className="btn-icon inline-flex h-4 w-4 items-center justify-center">
        <ArrowIcon />
      </span>
    </a>
  );
}

// ───────────────────────────────────────────────────────────────
// Plan card
// ───────────────────────────────────────────────────────────────

type Plan = {
  eyebrow: string;
  title: string;
  price: string;
  period: string;
  features: string[];
  ctaLabel: string;
  footer: string;
  isDark?: boolean;
};

function PlanCard({ plan }: { plan: Plan }) {
  const {
    eyebrow,
    title,
    price,
    period,
    features,
    ctaLabel,
    footer,
    isDark = false,
  } = plan;

  // Colour vocabulary — kept inline to avoid duplicating two variant trees.
  const surface = isDark
    ? "var(--color-obsidian-shade)"
    : "var(--color-pressed-linen)";
  const borderColor = isDark
    ? "color-mix(in srgb, var(--color-parchment-cream) 16%, transparent)"
    : "color-mix(in srgb, var(--color-midnight-ink) 16%, transparent)";
  const headlineColor = isDark
    ? "var(--color-parchment-cream)"
    : "var(--color-midnight-ink)";
  const bodyStrong = isDark
    ? "color-mix(in srgb, var(--color-parchment-cream) 88%, transparent)"
    : "color-mix(in srgb, var(--color-midnight-ink) 88%, transparent)";
  const bodyMuted = isDark
    ? "color-mix(in srgb, var(--color-parchment-cream) 64%, transparent)"
    : "color-mix(in srgb, var(--color-midnight-ink) 64%, transparent)";
  const dividerColor = borderColor;

  return (
    // pt-4 compensates for the body's `-mt-16` overlapping the 48px eyebrow
    // by 16px more than needed. Without this, the body extends 16px above
    // the grid wrapper's top edge, eating into SectionGrid's row gap on
    // stacked layouts (mobile single-col, tablet's lone third card on row 2)
    // and collapsing the visible inter-card gap to ~8px.
    <div className="group relative flex h-full w-full flex-col pt-4">
      {/* Eyebrow strip — fully hidden behind the card by default. On hover/focus
       * it translates up far enough that the entire label clears the card's top
       * edge, like a tab pulling out from behind. */}
      <div
        className="relative z-0 rounded-t-cards-large border border-b-0 px-8 pt-2 pb-6 transition-transform duration-base ease-standard group-hover:-translate-y-[52px] group-focus-within:-translate-y-[52px] max-md:px-6 max-md:pt-2 max-md:pb-4"
        style={{ backgroundColor: surface, borderColor }}
        data-mr-tone={isDark ? "dark" : undefined}
      >
        <span
          className="text-label-small font-mono uppercase tracking-wider"
          style={{ color: bodyStrong }}
        >
          {eyebrow}
        </span>
      </div>

      {/* Card body — overlaps the eyebrow strip by 64px so the tab is fully
       * covered in the default state regardless of text/padding heights.
       * flex-1 lets the card stretch so every tier shares the tallest height. */}
      <div
        className="relative z-10 -mt-16 flex flex-1 flex-col gap-6 rounded-cards-large border p-8 max-md:gap-4 max-md:p-6"
        style={{ backgroundColor: surface, borderColor, color: bodyStrong }}
        data-mr-tone={isDark ? "dark" : undefined}
      >
        {/* Plan name */}
        <div
          className="text-body-large max-md:text-body-medium"
          style={{ color: bodyStrong, fontFamily: "var(--font-body)" }}
        >
          {title}
        </div>

        {/* Price */}
        <div className="flex items-end gap-2">
          <div
            className="text-heading-3 max-md:text-heading-4 font-display"
            style={{ color: headlineColor }}
          >
            {price}
          </div>
          <div
            className="pb-1 text-body-small max-md:text-label-large"
            style={{ color: bodyMuted }}
          >
            {period}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />

        {/* Feature list */}
        <div className="flex flex-col items-start gap-6 max-md:gap-4">
          <span
            className="text-label-large font-mono uppercase tracking-wider"
            style={{ color: bodyStrong }}
          >
            Includes
          </span>
          <ul className="flex w-full list-none flex-col gap-4 p-0 max-md:gap-3" role="list">
            {features.map((feature, i) => (
              <li
                key={i}
                className="m-0 flex items-center gap-4 max-md:gap-3"
              >
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-inputs p-1"
                  style={{
                    backgroundColor: "var(--color-parchment-cream)",
                    color: "var(--color-midnight-ink)",
                  }}
                >
                  <span className="block h-4 w-4">
                    <CheckIcon />
                  </span>
                </span>
                <span
                  className="text-body-small max-md:text-label-large"
                  style={{ color: bodyStrong }}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA + footer caption — anchored to the bottom so cards with
         * shorter feature lists keep the action aligned across all tiers. */}
        <div className="mt-auto flex flex-col gap-6 max-md:gap-4">
          <PillButton
            label={ctaLabel}
            variant={isDark ? "inverse" : "primary"}
            className="w-full"
          />
          <div
            className="min-h-[2lh] text-body-small max-md:text-label-large"
            style={{ color: bodyMuted }}
          >
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Bottom guidance CTA bar
// ───────────────────────────────────────────────────────────────

function GuidanceBar() {
  // Avatar seeds — picsum.photos with stable seeds.
  // Per project rule, no BYQ-supply / third-party demo CDN references.
  const avatars = [
    { seed: "halden-guide-1", alt: "Portrait — advisor one" },
    { seed: "halden-guide-2", alt: "Portrait — advisor two" },
    { seed: "halden-guide-3", alt: "Portrait — advisor three" },
    { seed: "halden-guide-4", alt: "Portrait — advisor four" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 max-md:gap-6">
      <div className="flex items-center gap-6 max-md:gap-4 max-sm:flex-wrap max-sm:justify-center">
        {/* Avatar stack */}
        <div className="flex">
          {avatars.map((a, i) => (
            <div
              key={a.seed}
              className="h-12 w-12 flex-none overflow-hidden rounded-full border-2 max-sm:h-10 max-sm:w-10"
              style={{
                borderColor: "var(--color-parchment-cream)",
                marginLeft: i === 0 ? 0 : "-1rem",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/${a.seed}/96/96`}
                loading="lazy"
                alt={a.alt}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <div className="text-button-large text-fg" style={{ fontFamily: "var(--font-body)" }}>
            Need guidance?
          </div>
          <div className="text-body-small text-fg-muted">
            We're always happy to provide help.
          </div>
        </div>
      </div>

      <PillButton label="Contact us" />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Section
// ───────────────────────────────────────────────────────────────

const plans: Plan[] = [
  {
    eyebrow: "Starter",
    title: "Advisory Sessions",
    price: "$900",
    period: "/ month",
    features: [
      "Strategic input on messaging or tone",
      "Preparation for critical announcements",
      "Monthly reporting",
    ],
    ctaLabel: "Get started",
    footer: "Best for early-stage founders looking for clarity and structure.",
  },
  {
    eyebrow: "Standard",
    title: "Project Engagements",
    price: "$9,000",
    period: "/ month",
    features: [
      "Messaging frameworks and narratives",
      "M&A / restructuring communication",
      "Monthly reporting",
    ],
    ctaLabel: "Get started",
    footer: "Best for scale-ups navigating a defined moment of change.",
  },
  {
    eyebrow: "For executives",
    title: "Ongoing Partnership",
    price: "Custom",
    period: "/ month",
    features: [
      "Continuous advisory and coaching",
      "Stakeholder alignment sessions",
      "Embedded leadership support",
    ],
    ctaLabel: "Get started",
    footer: "Best for executives wanting a sustained editorial partner.",
    isDark: true,
  },
];

export function PricingThreeTier({ position }: { position?: number }) {
  // Sequential scroll-in reveal — when the cards row enters the viewport
  // (top 85%), each card fades + lifts in with a 0.12s stagger. Respects
  // prefers-reduced-motion via gsap.matchMedia.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-section-id="${manifest.id}"]`,
    );
    if (!root) return;

    const ctx = gsap.context(() => {
      const cards = root.querySelectorAll<HTMLElement>("[data-pricing-card]");
      if (cards.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };
          gsap.from(cards, {
            y: reduceMotion ? 0 : 24,
            opacity: 0,
            duration: reduceMotion ? 0.2 : 0.5,
            ease: "power2.out",
            stagger: 0.12,
            scrollTrigger: {
              trigger: cards[0],
              start: "top 85%",
              toggleActions: "play none none none",
            },
          });
        },
      );

      return () => mm.kill();
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg bg-surface"
    >
      <SectionGrid>
        {/* Headline block — centred inside the 12-col grid, max 680px (Halden's prose measure). */}
        <div className="col-span-12 mx-auto mb-14 flex max-w-[42.5rem] flex-col items-center gap-6 text-center max-md:mb-8 max-md:gap-4">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center justify-center rounded-tags px-2 py-1"
            style={{ backgroundColor: "var(--color-pressed-linen)" }}
          >
            <span className="text-label-small font-mono uppercase tracking-wider text-fg">
              Pricing
            </span>
          </div>

          {/* Headline — italic emphasis on a single phrase, Halden's editorial signature. */}
          <h2 className="m-0 text-heading-2 font-display text-fg max-md:text-heading-4">
            Every project is different, but here are the typical ways{" "}
            <em>we structure our work</em>.
          </h2>
        </div>

        {/* Pricing cards — three even columns at max grid (1440px), each card
         * spanning 4 of the 12 grid columns with the inherited 24px gutter
         * (3×448px + 2×24px gaps inside the 1392px content track).
         *
         * Below the max grid, the cards break out and stack full-width
         * (col-span-12) so each tier gets its own row instead of being
         * crammed into three skinny columns at 1024–1280. SectionGrid's
         * 24px rowGap handles the vertical rhythm between stacked cards. */}
        {plans.map((plan) => (
          <div
            key={plan.title}
            data-pricing-card
            className="col-span-12 min-[1440px]:col-span-4"
          >
            <PlanCard plan={plan} />
          </div>
        ))}

        {/* Bottom guidance bar — vertical breathing room from cards via mt-20. */}
        <div className="col-span-12 mt-20 max-md:mt-14">
          <GuidanceBar />
        </div>
      </SectionGrid>
    </Section>
  );
}
