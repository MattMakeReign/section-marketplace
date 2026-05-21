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

import type { StaticImageData } from "next/image";
import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

// Co-located portrait assets. Imported statically so the bundler fingerprints
// + serves them — this is what makes the section self-contained: when another
// project (or the marketplace) installs this section, these JPGs travel with
// it. Designers replace the files in `./assets/` with the real team photos
// at the same filenames; no code change needed.
import john from "./assets/01-john.jpg";
import janina from "./assets/02-janina.jpg";
import sarah from "./assets/03-sarah.jpg";
import michael from "./assets/04-michael.jpg";
import david from "./assets/05-david.jpg";
import robert from "./assets/06-robert.jpg";
import jessica from "./assets/07-jessica.jpg";
import kevin from "./assets/08-kevin.jpg";

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
// filenames (01-john.jpg, 02-janina.jpg, …). The imports continue to resolve;
// the bundler picks up the new bytes; no code change needed.
// ───────────────────────────────────────────────────────────────

type Member = {
  name: string;
  role: string;
  photo: StaticImageData;
  alt: string;
};

const members: Member[] = [
  {
    name: "John Kowalski",
    role: "Partner",
    photo: john,
    alt: "Portrait of a man smiling warmly in soft studio lighting.",
  },
  {
    name: "Janina Boderek",
    role: "Founder",
    photo: janina,
    alt: "Portrait of a woman with blonde hair wearing glasses and a white blouse.",
  },
  {
    name: "Sarah Johnson",
    role: "Senior Consultant",
    photo: sarah,
    alt: "Portrait of a man smiling in a casual grey sweater against a dark background.",
  },
  {
    name: "Michael Brown",
    role: "Strategy Lead",
    photo: michael,
    alt: "Portrait of a man with a beard wearing a dark shirt.",
  },
  {
    name: "David Garcia",
    role: "Innovation Officer",
    photo: david,
    alt: "Portrait of a woman with short dark hair wearing glasses and a navy shirt.",
  },
  {
    name: "Robert Miller",
    role: "Solutions Architect",
    photo: robert,
    alt: "Portrait of a man with curly hair and beard in warm lighting.",
  },
  {
    name: "Jessica Mercedes",
    role: "Client Director",
    photo: jessica,
    alt: "Portrait of a woman with blonde hair and glasses wearing a cream sweater.",
  },
  {
    name: "Kevin Rodriguez",
    role: "Project Manager",
    photo: kevin,
    alt: "Portrait of a woman with tied hair wearing a beige top.",
  },
];

// ───────────────────────────────────────────────────────────────
// Card
// ───────────────────────────────────────────────────────────────

function TeamCard({ member }: { member: Member }) {
  // Panel surface = section surface so the cutouts and the section bleed
  // share a single colour. Inline so we don't need a CSS file.
  const panelSurface = "var(--surface-inverse)";

  return (
    <div
      data-team-card
      data-mr-reveal
      className="relative h-[19.1875rem] w-full overflow-hidden rounded-cards max-[479px]:h-[16.25rem]"
    >
      {/* Photo — full-bleed cover */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.photo.src}
        width={member.photo.width}
        height={member.photo.height}
        alt={member.alt}
        loading="lazy"
        className="absolute inset-0 z-[1] h-full w-full object-cover"
      />

      {/* Name/role panel — bottom-right inset with cutout decorations */}
      <div
        className="absolute right-0 bottom-0 z-[2] flex flex-col items-end gap-1 pt-3 pl-4 max-md:pt-[10px] max-md:pl-3"
        style={{
          backgroundColor: panelSurface,
          borderTopLeftRadius: "var(--radius-cards-large)",
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
        <div
          className="text-label-large max-md:text-label-medium"
          style={{
            color: "color-mix(in srgb, var(--color-parchment-cream) 64%, transparent)",
            fontFamily: "var(--font-body)",
          }}
        >
          {member.role}
        </div>

        {/* Bottom-left cutout — sits OUTSIDE the panel, to its left,
            painted in the section surface colour so it reads as a
            concave radius dissolving into the photo. */}
        <div
          className="pointer-events-none absolute z-[1] h-6 w-6"
          style={{
            color: panelSurface,
            bottom: "-2px",
            left: "2px",
            transform: "translate(-100%)",
          }}
        >
          <CornerSVG />
        </div>

        {/* Top-right cutout — sits OUTSIDE the panel, above its top edge. */}
        <div
          className="pointer-events-none absolute z-[1] h-6 w-6"
          style={{
            color: panelSurface,
            top: "2px",
            right: "-2px",
            transform: "translate(0%, -100%)",
          }}
        >
          <CornerSVG />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Section
// ───────────────────────────────────────────────────────────────

export function TeamGridDark({ position }: { position?: number }) {
  // Canonical scroll-in reveal — see `useReveal` in @mr/canonical-stack.
  // Headline reveals as a single target; the 8 cards stagger-reveal at 80ms
  // step when the grid enters view. CSS-driven, no GSAP / Lenis dependency.
  const headlineRef = useReveal<HTMLDivElement>();
  const cardsRef = useReveal<HTMLDivElement>({
    selector: "[data-team-card]",
    stagger: 80,
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
      <SectionGrid>
        {/* Headline block — left-aligned label + h3 */}
        <div
          ref={headlineRef}
          data-team-headline
          data-mr-reveal
          className="col-span-12 mb-16 flex flex-col gap-6 max-md:mb-12 max-md:gap-4"
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

        {/* Photo grid — own 4/3/2-col nested grid inside col-span-12.
            24px column / 32px row at desktop; tightens to 12/24 at mobile.
            The grid breaks out of the 12-col section grid because the tile
            count (4) doesn't divide evenly into 12 columns at all breakpoints.
            `cardsRef` watches the grid; each [data-team-card] reveals in
            sequence at 80ms step when the grid enters viewport. */}
        <div
          ref={cardsRef}
          className="col-span-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 max-md:gap-x-3 max-md:gap-y-6"
        >
          {members.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </div>
      </SectionGrid>
    </Section>
  );
}
