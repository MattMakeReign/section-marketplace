# FAQ Split with CTA

Two-column split: left column anchors eyebrow, heading, lede copy, and a single CTA button; right column stacks an accordion list of FAQ items, one panel open at a time, with a +/× toggle icon per row.

## When to use

- Page has 4–8 distinct questions that benefit from progressive disclosure rather than a wall of copy.
- The brief calls for a soft conversion nudge alongside FAQs — the left-column CTA keeps the contact action visible without a separate section.
- Visual tone is editorial or warm-minimal; the card-row accordion and serif-adjacent heading suit restrained brand systems.
- FAQ content lives near the bottom of a services, pricing, or contact page where objections need answering before the final CTA.

## When not to use

- More than ~10 FAQ items — the right column becomes an overwhelming scroll; prefer a tabbed or categorised pattern instead.
- FAQs belong inside a narrow content column (e.g. a blog post or case-study sidebar) where a two-column split is structurally too wide.
- The page already contains a prominent split section nearby — using this pattern in close succession creates visual monotony.
- The brand demands dense imagery or background media in its FAQ treatment; this layout carries no image slots.

## Props

| Prop | Type | Default |
|---|---|---|
| _… fill in …_ | | |

## Motion

Density: restrained. _Add specifics on what animates and when._

## Responsive

desktop-2col split (5/7 grid); mobile single-column stacked, left card above accordion. _Add breakpoint notes here._

## Tokens consumed

- Colour: _list the design-system colour tokens this section uses._
- Typography: _list the role-based type tokens this section uses._
- Rhythm: _list the spacing / section-padding tokens._

_This README is the AI-readable layer Claude consults when adapting the section into a new project. The richer it is, the better the adaptation._

## Adaptation notes

- **Tokens**: swap `bg-surface`, `bg-surface-elevated`, `text-accent`, `text-fg-muted`, and `border-border` for project-level design tokens; the warm cream background is purely token-driven.
- **Eyebrow colour**: `text-accent` renders rust/terracotta in the screenshot — change to match brand accent without touching structure.
- **CTA button**: the `btn-primary btn-large` variant should map to the project button system; pill radius in screenshot is high — adjust `border-radius` token if needed.
- **Accordion behaviour**: currently single-open (one panel at a time); if multi-open is required, replace `openIndex: number | null` state with a `Set<number>`.
- **Item count**: default is 6; 4–8 is the comfortable visual range — stay within it; do not inflate beyond what the left-column copy can credibly reference.
- **Left column copy**: heading uses `max-w-[18ch]`, body `max-w-[36ch]` — keep headings short (≤6 words) and body under 3 lines to avoid vertical imbalance with the accordion.

## Failure modes

- **Heading length > 6 words**: breaks the large-display heading onto 3+ lines, creating a much taller left column that misaligns vertically with the accordion list on desktop.
- **Answer copy too long**: very long answers push the open accordion card well below the left-column CTA, making the CTA feel detached from the content; keep answers under ~60 words.
- **Fewer than 3 items**: the right column looks sparse against the left anchor; use a simpler inline FAQ pattern instead.
- **More than 8 items**: right column overruns the left at desktop, the CTA button scrolls off-screen, and the structural balance collapses.
- **Missing CTA href**: the anchor renders as a dead link; always provide a valid `href` or conditionally suppress the CTA slot.
- **Mobile stacking order**: on narrow viewports the left card sits above the accordion, so the CTA appears before the questions — acceptable for most flows, but misaligned if the intent is to answer questions *before* surfacing the contact prompt.
