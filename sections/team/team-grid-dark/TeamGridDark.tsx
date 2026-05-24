/**
 * TeamGridDark — editorial team grid on an obsidian-shade background.
 *
 * Layout: monospace eyebrow + Plex Serif headline above an 8-portrait grid
 * (4-up at lg, 3-up at md, 2-up below). Each portrait card has a small
 * bottom-right text panel (name + role) with inverted-radius corner cutouts
 * so the panel reads like it's been die-cut into the photo.
 *
 * Halden Miller flavour:
 *   - Dark band: `bg-surface-inverse` (obsidian shade).
 *   - Headline: Plex Serif at heading-3 (40/44 desktop), italic-emphasis-ready.
 *   - Eyebrow: Plex Mono uppercase pill with 0.0625em tracking.
 *   - Portraits use picsum.photos seeds — per workspace rule no third-party
 *     reference CDNs (no BYQ URLs) and no @fonts headers (fonts are wired
 *     centrally in design-system/fonts.css).
 *
 * Motion:
 *   - Headline blurs in (12px → 0) + fades on scroll into view.
 *   - Eight cards stagger-fade on scroll-in (0.08s step).
 *   - All via GSAP + ScrollTrigger from the canonical stack; respects
 *     prefers-reduced-motion via gsap.matchMedia.
 */

"use client";

import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

// Asset URLs are served by the project's `/api/section-asset/<id>/<file>`
// route handler — they stream the bytes off disk under `sections/<id>/assets/`.
// We use the route (rather than static imports of each JPG) so the dynamic
// MediaManager flow can add / remove / reorder portraits without code changes
// and so re-uploaded files reflect immediately (the route ships `Cache-Control:
// no-store`). The JPG files themselves still travel with the section through
// `mr submit` because they live in this folder.
function assetUrl(filename: string) {
  return `/api/section-asset/team-grid-dark/${filename}`;
}

// ───────────────────────────────────────────────────────────────
// Corner cutout — inverted radius decoration for the panel
// ───────────────────────────────────────────────────────────────

/**
 * Concave quarter-circle drawn in the panel's surface colour. Placed at the
 * panel's outer corners (bottom-left and top-right) so the meeting edge with
 * the photograph reads as a smooth inverse-curve rather than a hard right
 * angle. Pure SVG; inherits its fill from `currentColor`.
 */
function CornerSVG() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 26 26"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M25.998 26.0019L25.998 -18.0557L-15.9727 -18.0557L23.998 -18.0553L23.998 8.00194C23.998 16.8385 16.8346 24.0019 7.99804 24.0019L-15.9727 24.0019V26.0019L25.998 26.0019Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────
// Team data — references the co-located portrait imports above.
//
// To swap in real team photos: replace the files in ./assets/ at the same
// filenames (https://picsum.photos/seed/team-grid-dark-asset-0/1200/800, https://picsum.photos/seed/team-grid-dark-asset-1/1200/800, …). The imports continue to resolve;
// the bundler picks up the new bytes; no code change needed.
// ───────────────────────────────────────────────────────────────

export type Member = {
  name: string;
  role: string;
  /** URL the section's <img> uses. */
  photo: string;
  /** Filename inside `assets/`, used by the editor's MediaManager so uploads
   *  can target the same path on disk (e.g. "https://picsum.photos/seed/team-grid-dark-asset-0/1200/800"). */
  filename: string;
  alt: string;
};

export const DEFAULT_MEMBERS: Member[] = [
  {
    name: "John Kowalski",
    role: "Partner",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-0/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-0/1200/800"),
    alt: "Portrait of a man smiling warmly in soft studio lighting.",
  },
  {
    name: "Janina Boderek",
    role: "Founder",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-1/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-1/1200/800"),
    alt: "Portrait of a woman with blonde hair wearing glasses and a white blouse.",
  },
  {
    name: "Sarah Johnson",
    role: "Senior Consultant",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-2/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-2/1200/800"),
    alt: "Portrait of a man smiling in a casual grey sweater against a dark background.",
  },
  {
    name: "Michael Brown",
    role: "Strategy Lead",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-3/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-3/1200/800"),
    alt: "Portrait of a man with a beard wearing a dark shirt.",
  },
  {
    name: "David Garcia",
    role: "Innovation Officer",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-4/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-4/1200/800"),
    alt: "Portrait of a woman with short dark hair wearing glasses and a navy shirt.",
  },
  {
    name: "Robert Miller",
    role: "Solutions Architect",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-5/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-5/1200/800"),
    alt: "Portrait of a man with curly hair and beard in warm lighting.",
  },
  {
    name: "Jessica Mercedes",
    role: "Client Director",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-6/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-6/1200/800"),
    alt: "Portrait of a woman with blonde hair and glasses wearing a cream sweater.",
  },
  {
    name: "Kevin Rodriguez",
    role: "Project Manager",
    filename: "https://picsum.photos/seed/team-grid-dark-asset-7/1200/800",
    photo: assetUrl("https://picsum.photos/seed/team-grid-dark-asset-7/1200/800"),
    alt: "Portrait of a woman with tied hair wearing a beige top.",
  },
];

// ───────────────────────────────────────────────────────────────
// Card
// ───────────────────────────────────────────────────────────────

export type PanelPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

function TeamCard({
  member,
  heightPx,
  radiusPx,
  showPanel,
  panelPosition,
  imageFit,
}: {
  member: Member;
  heightPx: number;
  radiusPx: number;
  showPanel: boolean;
  panelPosition: PanelPosition;
  imageFit: "cover" | "contain";
}) {
  const panelSurface = "var(--surface-inverse)";
  const isBottom = panelPosition.startsWith("bottom");
  const isRight = panelPosition.endsWith("right");

  return (
    <div
      data-team-card
      data-mr-reveal
      className="relative w-full overflow-hidden"
      style={{ height: heightPx, borderRadius: radiusPx }}
    >
      {/* Photo — full-bleed */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.photo}
        alt={member.alt}
        loading="lazy"
        className="absolute inset-0 z-[1] h-full w-full"
        style={{ objectFit: imageFit }}
      />

      {showPanel ? (
        <div
          className="absolute z-[2] flex flex-col gap-1 pt-3 pl-4 pr-4 pb-3 max-md:pt-[10px] max-md:pl-3 max-md:pr-3"
          style={{
            backgroundColor: panelSurface,
            top: isBottom ? "auto" : 0,
            bottom: isBottom ? 0 : "auto",
            left: isRight ? "auto" : 0,
            right: isRight ? 0 : "auto",
            alignItems: isRight ? "flex-end" : "flex-start",
            borderTopLeftRadius: isBottom && isRight ? "var(--radius-cards-large)" : 0,
            borderTopRightRadius: isBottom && !isRight ? "var(--radius-cards-large)" : 0,
            borderBottomLeftRadius: !isBottom && isRight ? "var(--radius-cards-large)" : 0,
            borderBottomRightRadius: !isBottom && !isRight ? "var(--radius-cards-large)" : 0,
          }}
        >
          <div
            className="text-label-large max-md:text-label-medium"
            style={{
              color: "var(--fg-inverse)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
            }}
          >
            {member.name}
          </div>
          {member.role ? (
            <div
              className="text-label-large max-md:text-label-medium"
              style={{
                color: "color-mix(in srgb, var(--color-parchment-cream) 64%, transparent)",
                fontFamily: "var(--font-body)",
              }}
            >
              {member.role}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Section
// ───────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────
// Structural props — exposed to the editor controller via editor.tsx.
//
// Photos and copy are content territory (the AI assistant + designer's
// ./assets/ folder). The editor only exposes the structural knobs.
// ───────────────────────────────────────────────────────────────

export type TeamGridDarkProps = {
  position?: number;
  /** Members rendered as portrait cards. Length drives the count — add to
   *  the array to grow the grid; remove to shrink. */
  members?: Member[];
  /** Columns at desktop. 2/3/4/6-up for creative range. */
  gridColumns?: 2 | 3 | 4 | 6;
  /** Card height in pixels. */
  cardHeightPx?: number;
  /** Card corner radius (px). */
  cardRadiusPx?: number;
  /** Gap between cards (px). */
  cardGapPx?: number;
  /** Image object-fit. */
  imageFit?: "cover" | "contain";
  /** Show the name/role panel on each card. */
  showPanel?: boolean;
  /** Which corner the panel anchors to. */
  panelPosition?: PanelPosition;
  /** Section background tone. */
  background?: "dark" | "light";
  /** Show the headline block above the grid. */
  showHeadline?: boolean;
  /** Headline alignment. */
  headlineAlign?: "left" | "center" | "right";
  /** Stagger between card reveal animations (ms). */
  staggerMs?: number;
};

export function TeamGridDark({
  position,
  members: membersProp,
  gridColumns = 4,
  cardHeightPx = 307,
  // Mirrors design-system `--radius-cards` (12px). Slider can override.
  cardRadiusPx = 12,
  cardGapPx = 16,
  imageFit = "cover",
  showPanel = true,
  panelPosition = "bottom-right",
  background = "dark",
  showHeadline = true,
  headlineAlign = "left",
  staggerMs = 80,
}: TeamGridDarkProps = {}) {
  const members = membersProp ?? DEFAULT_MEMBERS;
  const clampedHeight = Math.max(160, Math.min(640, Math.round(cardHeightPx)));
  const clampedRadius = Math.max(0, Math.min(48, Math.round(cardRadiusPx)));
  const clampedGap = Math.max(0, Math.min(48, Math.round(cardGapPx)));
  const clampedStagger = Math.max(0, Math.min(400, Math.round(staggerMs)));
  // Canonical scroll-in reveal — see `useReveal` in @mr/canonical-stack.
  // Headline reveals as a single target; the cards stagger-reveal at 80ms
  // step when the grid enters view. CSS-driven, no GSAP / Lenis dependency.
  const headlineRef = useReveal<HTMLDivElement>();
  const cardsRef = useReveal<HTMLDivElement>({
    selector: "[data-team-card]",
    stagger: clampedStagger,
  });

  const visibleMembers = members;
  // Tailwind classes must be literal for static extraction. Switch tree:
  const gridClass =
    gridColumns === 6
      ? "col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
      : gridColumns === 4
        ? "col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        : gridColumns === 3
          ? "col-span-12 grid grid-cols-2 md:grid-cols-3"
          : /* 2 */ "col-span-12 grid grid-cols-1 md:grid-cols-2";

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className={background === "light" ? "py-section-lg bg-surface" : "py-section-lg bg-surface-inverse"}
    >
      <SectionGrid>
        {showHeadline ? (
        <div
          ref={headlineRef}
          data-team-headline
          data-mr-reveal
          className={`col-span-12 mb-16 flex flex-col gap-6 max-md:mb-12 max-md:gap-4 ${
            headlineAlign === "center"
              ? "items-center text-center"
              : headlineAlign === "right"
                ? "items-end text-right"
                : "items-start text-left"
          }`}
        >
          {/* Eyebrow pill — mono on a slightly-lifted dark surface */}
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
              Partners in transition
            </span>
          </div>

          {/* Heading — Plex Serif, weight 400 (emphasis via italic, never weight) */}
          <h2
            className="m-0 text-heading-3 font-display max-md:text-heading-4"
            style={{ color: "var(--fg-inverse)" }}
          >
            A small, senior team.
            <br />
            No hand-offs, no layers.
            <br />
            <em>You work directly with us.</em>
          </h2>
        </div>
        ) : null}

        {/* Photo grid — column count, gap, radius, height all editor-driven. */}
        <div
          ref={cardsRef}
          className={gridClass}
          style={{ gap: clampedGap }}
        >
          {visibleMembers.map((member, i) => (
            <TeamCard
              key={`${member.filename}-${i}`}
              member={member}
              heightPx={clampedHeight}
              radiusPx={clampedRadius}
              showPanel={showPanel}
              panelPosition={panelPosition}
              imageFit={imageFit}
            />
          ))}
        </div>
      </SectionGrid>
    </Section>
  );
}
