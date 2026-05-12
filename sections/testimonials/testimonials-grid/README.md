# Testimonials — Grid

Three-up testimonial grid. Stacks single-column on mobile, three columns at md+. Use when you want every testimonial visible at once rather than browsable behind a swipe.

## When to use

- You have exactly three (or a multiple of three) high-quality testimonials.
- You want the social proof to land in one glance rather than reward exploration.
- The page already has horizontal motion elsewhere and you want a calm, static counterpoint.

## When not to use

- You have one or two quotes — pair with a single-quote band instead.
- You have five-plus quotes — use `carousel-quote` so the page doesn't bloat.

## Props

| Prop | Type | Default |
|---|---|---|
| `eyebrow` | string | "Clients" |
| `heading` | string | "What people we work with say." |
| `items` | `Array<{ quote, attribution, role? }>` | three sample testimonials |
| `position` | number | injected by `<SectionsContainer>` |

## Motion

- `minimal` — fully static.
- `restrained` — host project may add a viewport-entry reveal, staggered per card.

## Responsive

- < md: single column, cards full-width inside `<SectionGrid>`.
- ≥ md: three columns, equal-height via `auto-rows-fr`.

## Tokens consumed

- Colour: `bg-surface`, `bg-surface-elevated`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-border`.
- Typography: `text-label-small`, `text-heading-2`, `text-heading-3`, `text-body-large`, `text-body-medium`, `text-body-small`, `font-display`, `font-mono`.
- Rhythm: `py-section-lg`.
- Layout: standard structural utilities (`grid`, `grid-cols-*`, `gap-*`, `flex-col`, `auto-rows-fr`, `rounded-md`, `border`).

No hard-coded colours, no arbitrary font sizes, no `font-family` declarations.
