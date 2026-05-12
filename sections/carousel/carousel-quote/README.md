# Carousel — Quote

Horizontal scroll-snap carousel of quote cards. Pure CSS — no client-side JavaScript. Works for testimonials, press quotes, or a project highlights reel.

## When to use

- You have three or more quotes / testimonials / press mentions to surface.
- You want users to browse them at their own pace, mobile-first.
- You need a low-JS option that works without React state or third-party carousel libraries.

## When not to use

- You need autoplay or programmatic control of the active slide. (Pair with a different carousel section that ships its own client logic.)
- The content benefits from being visible all at once. (Use `testimonials-grid` instead.)

## Props

| Prop | Type | Default |
|---|---|---|
| `eyebrow` | string | "Praise" |
| `items` | `Array<{ quote, attribution, role? }>` | three sample quotes |
| `position` | number | injected by `<SectionsContainer>` |

## Behaviour

- Track is `display: flex` with horizontal `overflow-x-auto` and CSS scroll-snap.
- Each card is `min(85vw, 560px)` so cards stay legible on small screens and don't sprawl on large ones.
- On mobile, snap is `mandatory` (firm clicks). On desktop, snap is `proximity` (less aggressive feel).
- A small "Scroll →" hint appears at desktop widths.

## Motion

Inherits the host project's motion-density tier:
- `minimal` — no transitions; instant snap.
- `restrained` — soft easing on the scroll-snap.
- `cinematic` — combine with a host-project reveal that fades cards in on viewport entry.

No motion file shipped.

## Responsive

- All widths use the same scroll-snap pattern.
- Card width is fluid: `min(85vw, 560px)` with a `min-w-[280px]` floor so even narrow phones get a usable card.

## Tokens consumed

- Colour: `bg-surface-muted`, `bg-surface-elevated`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-border`.
- Typography: `text-label-small`, `text-heading-3`, `text-heading-4`, `text-body-medium`, `text-body-small`, `font-display`, `font-mono`.
- Rhythm: `py-section-md`.
- Layout: standard structural utilities (`flex`, `gap-*`, `overflow-x-auto`, `snap-*`, `rounded-md`, `border`).

The `w-[min(85vw,560px)]` and `min-w-[280px]` arbitrary utilities are layout sizes, not colours or fonts — allowed by the contract.

No hard-coded colours, no `font-family` declarations.
