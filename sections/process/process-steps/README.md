# Process Steps

Numbered process explainer with eyebrow, optional heading, and a 4-up ordered list of steps. Each step exposes a zero-padded index, a short label, and a body paragraph. Desktop: horizontal 4-column row. Mobile: single-column stack.

## When to use

- Use when the page needs to communicate a sequential workflow — 3–6 discrete phases — in a scannable, parallel format.
- Best fit for process, services, or about pages where the methodology itself is a trust signal.
- Works well mid-page between a positioning statement (hero/intro) and a social-proof or CTA section.
- Use when the design language is text-led and imagery is unavailable or unnecessary.

## When not to use

- Do not use for non-sequential content; if steps have no meaningful order, use a features grid instead.
- Avoid when step count falls outside 3–6: fewer than 3 feels thin at 4-up; more than 6 overflows the row and breaks visual parity.
- Not suitable when each step requires rich media (images, icons, video) — the layout has no image slot per step.
- Skip when the page already contains another dense text grid nearby; the similar rhythm will cause visual monotony.

## Props

| Prop | Type | Default |
|---|---|---|
| _… fill in …_ | | |

## Motion

Density: minimal · restrained. _Add specifics on what animates and when._

## Responsive

desktop-4up row / mobile-stacked. _Add breakpoint notes here._

## Tokens consumed

- Colour: _list the design-system colour tokens this section uses._
- Typography: _list the role-based type tokens this section uses._
- Rhythm: _list the spacing / section-padding tokens._

_This README is the AI-readable layer Claude consults when adapting the section into a new project. The richer it is, the better the adaptation._

## Adaptation notes

- **Tokens to change per project:** `bg-surface-muted`, `text-fg`, `text-fg-subtle`, `text-fg-muted`, `border-border` — remap to project surface/border tokens.
- **Eyebrow format:** the section-number prefix (`Section 01 ·`) is stylistic; remove or replace with a plain eyebrow if section numbering isn't a design system convention.
- **Heading:** optional — omit for tighter vertical rhythm when the eyebrow alone provides enough context.
- **Step count:** the grid is `grid-cols-4` at md+; changing to 3 or 5 steps requires adjusting the grid-cols value accordingly.
- **Typography scale:** `text-heading-4` for step labels and `text-body-medium` for descriptions are intentionally compact — scale up only if the section is the primary focal point of the page.
- **Border treatment:** the top border on each step card is the primary structural divider; do not remove without replacing with an equivalent separator.

## Failure modes

- **Long step labels** (>4 words) unbalance the heading hierarchy — keep labels short and noun-led.
- **Long descriptions** (>40 words per step) create uneven card heights at desktop, breaking the horizontal baseline alignment.
- **5-step or 3-step arrays** leave the 4-col grid with an orphaned or missing column — the `grid-cols-4` must be updated to match.
- **No heading + no eyebrow** leaves the section with no entry point above the step list; at minimum the eyebrow should be present.
- **Very short descriptions** (<15 words) produce visually sparse cards that feel unfinished at desktop width.
- **Mobile at high step counts (>6):** single-column stack becomes very long; consider a condensed accordion variant for mobile at that scale.
