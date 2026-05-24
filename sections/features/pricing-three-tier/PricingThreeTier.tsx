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

import { useState } from "react";
import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

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
};

function PlanCard({
  plan,
  isDark = false,
  cardPaddingPx = 32,
  cardRadiusPx = 24,
  showDivider = true,
  showEyebrowTab = true,
}: {
  plan: Plan;
  isDark?: boolean;
  cardPaddingPx?: number;
  cardRadiusPx?: number;
  showDivider?: boolean;
  showEyebrowTab?: boolean;
}) {
  const {
    eyebrow,
    title,
    price,
    period,
    features,
    ctaLabel,
    footer,
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
        className={`relative z-0 border border-b-0 px-8 pt-2 pb-6 transition-transform duration-base ease-standard ${showEyebrowTab ? "group-hover:-translate-y-[52px] group-focus-within:-translate-y-[52px]" : ""} max-md:px-6 max-md:pt-2 max-md:pb-4`}
        style={{
          backgroundColor: surface,
          borderColor,
          borderTopLeftRadius: cardRadiusPx,
          borderTopRightRadius: cardRadiusPx,
          opacity: showEyebrowTab ? 1 : 0,
          pointerEvents: showEyebrowTab ? undefined : "none",
        }}
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
        className="relative z-10 -mt-16 flex flex-1 flex-col gap-6 border max-md:gap-4"
        style={{
          backgroundColor: surface,
          borderColor,
          color: bodyStrong,
          padding: cardPaddingPx,
          borderRadius: cardRadiusPx,
        }}
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
        {showDivider ? (
          <div className="h-px w-full" style={{ backgroundColor: dividerColor }} />
        ) : null}

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

const defaultPlans: Plan[] = [
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
  },
];

// ───────────────────────────────────────────────────────────────
// Structural props — exposed to the editor controller via editor.tsx.
//
// Tier copy (titles, prices, features, etc.) is content territory and
// belongs to the AI assistant, not the editor panel. The structural
// knobs below are what a designer actually wants to fiddle:
//   - tierCount: 1 | 2 | 3   — drop tiers for compressed pricing pages.
//   - featuredIndex: 0|1|2   — which card renders dark (the featured one).
//   - showAvatarBar: boolean — hide the bottom guidance bar.
// ───────────────────────────────────────────────────────────────

export type PricingThreeTierProps = {
  position?: number;
  /** Number of tiers visible (0–3). Slider-driven via editor.tsx. */
  tierCount?: number;
  /** Which tier renders dark/featured. */
  featuredIndex?: 0 | 1 | 2;
  /** Card padding inside the body (px). */
  cardPaddingPx?: number;
  /** Card corner radius (px). */
  cardRadiusPx?: number;
  /** Gap between cards (px). */
  cardGapPx?: number;
  /** Eyebrow tab that peeks behind the card on hover. */
  showEyebrowTab?: boolean;
  /** Divider line between price and features. */
  showDivider?: boolean;
  /** Top headline + eyebrow pill. */
  showHeadline?: boolean;
  /** Headline alignment. */
  headlineAlign?: "left" | "center" | "right";
  /** Bottom guidance / avatar bar. */
  showAvatarBar?: boolean;
};

export function PricingThreeTier({
  position,
  tierCount = 3,
  featuredIndex = 2,
  cardPaddingPx = 32,
  // Mirrors design-system `--radius-cards-large` (16px). Slider can override.
  cardRadiusPx = 16,
  cardGapPx = 24,
  showEyebrowTab = true,
  showDivider = true,
  showHeadline = true,
  headlineAlign = "center",
  showAvatarBar = true,
}: PricingThreeTierProps = {}) {
  const clampedCount = Math.max(0, Math.min(3, Math.round(tierCount)));
  const plans = defaultPlans.slice(0, clampedCount);
  // Grid column class — adapts to the visible tier count so 2 tiers split
  // into two even columns, 1 tier centres at half-width, 3 fills the row.
  // Tailwind needs literal class names for static extraction.
  const cardColSpan =
    clampedCount <= 1
      ? "col-span-12 lg:col-span-6 lg:col-start-4" // centred
      : clampedCount === 2
        ? "col-span-12 lg:col-span-6"
        : "col-span-12 lg:col-span-4";
  // Canonical scroll-in reveal — see `useReveal` in @mr/canonical-stack.
  // Headline reveals as a single target; three cards stagger-reveal at 120ms
  // step when the row enters viewport. CSS-driven; honours
  // prefers-reduced-motion via the global CSS rule.
  const headlineRef = useReveal<HTMLDivElement>();
  const cardsRef = useReveal<HTMLDivElement>({
    selector: "[data-pricing-card]",
    stagger: 120,
  });

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg bg-surface"
    >
      <SectionGrid ref={cardsRef} style={{ rowGap: cardGapPx }}>
        {showHeadline ? (
        /* Headline block — alignment driven by `headlineAlign`. Centred is
         * the default; left / right align the eyebrow pill and the heading. */
        <div
          ref={headlineRef}
          data-mr-reveal
          className={`col-span-12 mb-14 flex max-w-[42.5rem] flex-col gap-6 max-md:mb-8 max-md:gap-4 ${
            headlineAlign === "left"
              ? "mr-auto items-start text-left"
              : headlineAlign === "right"
                ? "ml-auto items-end text-right"
                : "mx-auto items-center text-center"
          }`}
        >
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
        ) : null}

        {/* Pricing cards — three even columns from `lg` (991px) up, each
         * card spanning 4 of the 12 grid columns with the inherited 24px
         * gutter. At 991px+ the cards sit comfortably side-by-side; below
         * that they stack full-width (col-span-12) so each tier gets its
         * own row on mobile + small tablets. SectionGrid's 24px rowGap
         * handles the vertical rhythm between stacked cards. */}
        {plans.map((plan, i) => (
          <div
            key={plan.title}
            data-pricing-card
            data-mr-reveal
            className={cardColSpan}
          >
            <PlanCard
              plan={plan}
              isDark={i === featuredIndex}
              cardPaddingPx={cardPaddingPx}
              cardRadiusPx={cardRadiusPx}
              showDivider={showDivider}
              showEyebrowTab={showEyebrowTab}
            />
          </div>
        ))}

        {/* Bottom guidance bar — vertical breathing room from cards via mt-20. */}
        {showAvatarBar && (
          <div className="col-span-12 mt-20 max-md:mt-14">
            <GuidanceBar />
          </div>
        )}
      </SectionGrid>
    </Section>
  );
}
