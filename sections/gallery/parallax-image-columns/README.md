# Parallax Image Columns

Full-bleed scroll-driven gallery: four image columns each translating upward at distinct parallax rates, producing a layered depth effect. A centered scroll-cue band sits above the image field.

## When to use

- Use when the primary purpose is an immersive, imagery-led moment — editorial portfolios, team introductions, or campaign galleries where scroll reward is a design goal.
- Use when 12+ high-quality portrait or editorial images are available (4 columns × 3 rows minimum) and visual variety across columns is desirable.
- Use as a transitional 'statement' section between a hero and narrative copy blocks to add kinetic texture to an otherwise text-heavy page.
- Use when the audience is on desktop or large tablet and a cinematic scroll experience is appropriate for the brand register.

## When not to use

- Do not use when fewer than 8 quality images are available — sparse columns expose the parallax scaffolding and break the composition.
- Do not use as the primary navigation or information-delivery section; it carries no semantic hierarchy beyond scroll cue and caption.
- Do not use on pages where motion accessibility is a hard constraint — while reduced-motion disables parallax, the layout still requires image-heavy assets that may be inappropriate for low-bandwidth contexts.
- Do not use on mobile-first or form-heavy pages where horizontal overflow or compressed columns degrade the experience.

## Props

| Prop | Type | Default |
|---|---|---|
| _… fill in …_ | | |

## Motion

Density: cinematic.

## Responsive

desktop-rich / tablet-horizontal-scroll / mobile-compressed.

## Tokens consumed

- Colour: _list the design-system colour tokens this section uses._
- Typography: _list the role-based type tokens this section uses._
- Rhythm: _list the spacing / section-padding tokens._

## Adaptation notes

- **Imagery:** Replace placeholder portraits with project-appropriate photography. Aspect ratio 4:5 per slot is structural; changing it disrupts column rhythm. Muted or tonal backgrounds per image keep the multi-column composition coherent.
- **Eyebrow / scroll cue:** Default 'SCROLL' label is a functional affordance, not branding — remap to locale or omit if a scroll indicator exists elsewhere on the page.
- **Caption:** Optional single-line caption below the grid; use for attribution or section label only — extended copy breaks the airy whitespace below the columns.
- **Parallax rates:** The differential translate values per column are structural tokens — adjust magnitude (not direction) to suit scroll depth of the containing page. Faster rates suit long-scroll pages; subtle rates suit shorter pages.
- **Column count:** Four columns is the structural assumption. Reducing to three is viable but disrupts the asymmetric rhythm visible in the screenshot; do not reduce below three.

## Failure modes

- **Fewer than 12 images:** Empty or repeated slots within a column are immediately visible and destroy the depth illusion — always supply the full 4×3 grid.
- **Uniform image tone:** If all images share the same background colour and exposure, the parallax layers collapse visually into a flat grid — ensure per-column tonal variation.
- **Oversized H1 or body copy inserted above:** The scroll-cue band is a minimal eyebrow; placing a full headline block above it breaks the 'pure gallery' reading of the section.
- **Very short page:** If the page scroll depth is less than ~200vh, the parallax offset may not complete, leaving columns visually misaligned at page end.
- **SSR / no-JS environments:** GSAP ScrollTrigger and Lenis are runtime dependencies — ensure graceful fallback to static stacked columns on no-JS render to avoid invisible or broken layout.
