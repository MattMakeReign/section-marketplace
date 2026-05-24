"use client";

/**
 * ProcessStepsPortraits — dark editorial process section.
 *
 * Layout: left-aligned monospace eyebrow + Plex Serif headline + body, followed
 * by a 3-up grid of tall portrait cards (one per step). Each card carries a
 * step number at the top, title + body at the bottom, on a gently animated
 * portrait bed (CSS ken-burns + dark overlay).
 *
 * Halden Miller flavour:
 *   - Dark band: `bg-surface-inverse` (obsidian shade).
 *   - Headline: Plex Serif at heading-3 (40/44 desktop), italic-emphasis-ready.
 *   - Eyebrow: Plex Mono uppercase pill, 0.0625em tracking.
 *   - Step numbers: Plex Serif at 32px, weight 400.
 *   - Card portraits use co-located JPGs in ./assets/.
 *
 * Why ken-burns instead of video:
 *   - Three independent looping videos would be a 5-10MB cost for a
 *     section that lives below the fold. CSS keyframe ken-burns on a static
 *     poster gives the same "alive but quiet" effect at ~70KB per card.
 *   - Designers swap the JPGs in ./assets/ at the same filenames to
 *     reskin without touching code.
 *
 * Motion (canonical stack — `useReveal` from @mr/canonical-stack):
 *   - Headline blurs in (10px → 0) + lifts (28px → 0) + fades on viewport
 *     entry, via CSS transition on `data-mr-revealed` attribute.
 *   - Three cards stagger-reveal on viewport entry — 120ms step, driven by
 *     `--mr-reveal-index` × `--mr-reveal-stagger` CSS calc on the children.
 *   - No GSAP / ScrollTrigger / Lenis dependency at the section level —
 *     IntersectionObserver + CSS only. Travels with the section into the
 *     marketplace render iframe and any other host context that loads
 *     `@mr/canonical-stack/styles.css`.
 *   - `prefers-reduced-motion` honoured by the global CSS rule.
 */

"use client";

import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

const SECTION_ID = "process-steps-portraits";
const assetUrl = (filename: string) => `/api/section-asset/${SECTION_ID}/${filename}`;

// ───────────────────────────────────────────────────────────────
// Steps data
// ───────────────────────────────────────────────────────────────

export type Step = {
  number: string;
  title: string;
  body: string;
  /** URL the section renders. */
  photo: string;
  /** Filename inside assets/, used by the editor's MediaManager. */
  filename: string;
  alt: string;
  /** ken-burns variant index 0–2 — keeps the cards out of phase */
  variant: 0 | 1 | 2;
};

export const DEFAULT_STEPS: Step[] = [
  {
    number: "01",
    title: "Intro call",
    body: "A 30-minute conversation to understand your challenge.",
    filename: "01-hallway.jpg",
    photo: assetUrl("01-hallway.jpg"),
    alt: "Portrait of a woman in warm natural light.",
    variant: 0,
  },
  {
    number: "02",
    title: "Proposal & fit",
    body: "Clear next steps, scope, and expected outcomes — no jargon.",
    filename: "02-portrait.jpg",
    photo: assetUrl("02-portrait.jpg"),
    alt: "Editorial portrait of a woman against a soft background.",
    variant: 1,
  },
  {
    number: "03",
    title: "Start working",
    body: "Direct collaboration with senior consultants from day one.",
    filename: "03-blazer.jpg",
    photo: assetUrl("03-blazer.jpg"),
    alt: "Portrait of a smiling person wearing a tailored blazer.",
    variant: 2,
  },
];

// ───────────────────────────────────────────────────────────────
// Card
// ───────────────────────────────────────────────────────────────

function StepCard({
  step,
  heightPx,
  radiusPx,
  washStrength,
}: {
  step: Step;
  heightPx: number;
  radiusPx: number;
  washStrength: number;
}) {
  return (
    <div
      data-process-card
      data-mr-reveal
      className="relative w-full overflow-hidden"
      style={{
        height: heightPx,
        borderRadius: radiusPx,
        backgroundColor: "var(--surface-inverse)",
        border: "1px solid color-mix(in srgb, var(--color-parchment-cream) 16%, transparent)",
        ["--mr-wash-opacity" as string]: String(washStrength / 100),
      }}
    >
      {/* Portrait bed — full-bleed cover with ken-burns animation. Always
          loaded so the hover reveal is instant. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-process-bed
        data-variant={step.variant}
        src={step.photo}
        alt={step.alt}
        loading="lazy"
        className="absolute inset-0 z-[1] h-full w-full object-cover"
      />

      {/* Bottom legibility gradient — always present at low strength, so
          body copy stays readable when the dark wash fades on hover. */}
      <div
        data-process-gradient
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-2/3"
        style={{
          backgroundImage:
            "linear-gradient(to top, color-mix(in srgb, var(--color-obsidian-shade) 80%, transparent), transparent)",
        }}
        aria-hidden
      />

      {/* Dark wash — opaque by default, fades to 0 on hover to reveal the
          portrait. Pre-hover the card reads as a solid obsidian tile. */}
      <div
        data-process-wash
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{ backgroundColor: "var(--color-obsidian-shade)" }}
        aria-hidden
      />

      {/* Content — step number top, title/body bottom */}
      <div className="relative z-[4] flex h-full w-full flex-col justify-between p-6 max-md:p-5">
        <div
          className="text-heading-4 font-display max-md:text-heading-5"
          style={{ color: "var(--fg-inverse)", letterSpacing: "-0.02em" }}
        >
          {step.number}
        </div>

        <div className="flex flex-col gap-2">
          <div
            className="text-heading-5 font-display max-md:text-heading-5"
            style={{
              color: "var(--fg-inverse)",
              whiteSpace: "nowrap",
            }}
          >
            {step.title}
          </div>
          <div
            className="text-body-small"
            style={{
              color:
                "color-mix(in srgb, var(--color-parchment-cream) 72%, transparent)",
              fontFamily: "var(--font-body)",
            }}
          >
            {step.body}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Section
// ───────────────────────────────────────────────────────────────

export type ProcessStepsPortraitsProps = {
  position?: number;
  headlineAlign?: "left" | "center" | "right";
  /** Columns of process cards at desktop. */
  columns?: 1 | 2 | 3;
  /** Card height (px). */
  cardHeightPx?: number;
  /** Card corner radius (px). */
  cardRadiusPx?: number;
  /** Gap between cards (px). */
  cardGapPx?: number;
  /** Stagger between card reveals (ms). */
  staggerMs?: number;
  /** Dark wash opacity over the portrait beds (0–100). */
  washStrength?: number;
  /** Steps with media — managed via MediaManager in editor.tsx. */
  steps?: Step[];
};

export function ProcessStepsPortraits({
  position,
  headlineAlign = "left",
  columns = 3,
  cardHeightPx = 480,
  cardRadiusPx = 12,
  cardGapPx = 24,
  staggerMs = 120,
  washStrength = 60,
  steps: stepsProp,
}: ProcessStepsPortraitsProps = {}) {
  const steps = stepsProp ?? DEFAULT_STEPS;
  // Headline reveals when its container enters the viewport (single target).
  const headlineRef = useReveal<HTMLDivElement>();
  // Cards reveal in sequence with a 120ms stagger when the grid enters view.
  const cardsRef = useReveal<HTMLDivElement>({
    selector: "[data-process-card]",
    stagger: staggerMs,
  });

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg bg-surface-inverse"
    >
      {/* Scoped ken-burns keyframes. Three variants so the three cards
          don't pan in lockstep. */}
      <style>{`
        @keyframes mr-pkb-0 {
          0%   { transform: scale(1)    translate(0, 0); }
          100% { transform: scale(1.08) translate(-1.5%, -1%); }
        }
        @keyframes mr-pkb-1 {
          0%   { transform: scale(1.04) translate(1%, -0.5%); }
          100% { transform: scale(1.10) translate(-1%, 1%); }
        }
        @keyframes mr-pkb-2 {
          0%   { transform: scale(1)    translate(-1%, 0); }
          100% { transform: scale(1.07) translate(1.5%, -1.5%); }
        }
        [data-process-bed][data-variant="0"] {
          animation: mr-pkb-0 18s ease-in-out infinite alternate;
          transform-origin: center center;
          will-change: transform;
        }
        [data-process-bed][data-variant="1"] {
          animation: mr-pkb-1 22s ease-in-out infinite alternate;
          transform-origin: center center;
          will-change: transform;
        }
        [data-process-bed][data-variant="2"] {
          animation: mr-pkb-2 20s ease-in-out infinite alternate;
          transform-origin: center center;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-process-bed] { animation: none !important; }
        }

        /* Dark wash — opaque by default (card reads as a solid dark tile),
           fades to 0 on hover so the portrait reveals smoothly. */
        [data-process-wash] {
          opacity: var(--mr-wash-opacity, 1);
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-process-card]:hover [data-process-wash] {
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-process-wash] { transition: opacity 200ms linear; }
        }
      `}</style>

      <SectionGrid>
        <div
          ref={headlineRef}
          data-process-headline
          data-mr-reveal
          className={`col-span-12 mb-16 flex max-w-[28rem] flex-col gap-6 max-md:mb-12 max-md:gap-4 ${
            headlineAlign === "center" ? "items-center text-center mx-auto"
            : headlineAlign === "right" ? "items-end text-right ml-auto"
            : "items-start text-left"
          }`}
        >
          <div
            className="inline-flex w-fit items-center justify-center rounded-tags px-2 py-1"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-parchment-cream) 8%, transparent)",
            }}
          >
            <span
              className="text-label-small font-mono uppercase tracking-wider"
              style={{ color: "var(--fg-inverse)" }}
            >
              Contact process
            </span>
          </div>

          <div className="flex flex-col gap-4 max-md:gap-3">
            <h2
              className="m-0 text-heading-3 font-display max-md:text-heading-4"
              style={{ color: "var(--fg-inverse)" }}
            >
              Your work deserves a <em>better framework</em>.
            </h2>
            <p
              className="m-0 text-body"
              style={{
                color:
                  "color-mix(in srgb, var(--color-parchment-cream) 64%, transparent)",
                fontFamily: "var(--font-body)",
              }}
            >
              More than execution — we turn complexity into a clear framework
              and stay with you while it takes hold.
            </p>
          </div>
        </div>

        {/* Cards grid — 3-up at md+, 2-up at sm, 1-up at base.
            Nested inside col-span-12 so the section grid wraps it.
            `cardsRef` watches the grid; each [data-process-card] child
            reveals in sequence with a 120ms stagger when the grid enters
            the viewport. */}
        <div
          ref={cardsRef}
          className={`col-span-12 grid grid-cols-1 ${
            columns === 1 ? ""
            : columns === 2 ? "sm:grid-cols-2"
            : "sm:grid-cols-2 md:grid-cols-3"
          }`}
          style={{ gap: cardGapPx }}
        >
          {steps.map((step) => (
            <StepCard
              key={step.number}
              step={step}
              heightPx={cardHeightPx}
              radiusPx={cardRadiusPx}
              washStrength={washStrength}
            />
          ))}
        </div>
      </SectionGrid>
    </Section>
  );
}