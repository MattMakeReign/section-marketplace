# Hero — Split Bold

Default hero for editorial / agency / portfolio work. Two columns: a bold display headline on the left, supporting copy plus a primary/secondary CTA pair on the right.

## When to use

- Opening section of a marketing site, agency homepage, or portfolio.
- The site has a single, clear positioning statement that benefits from breathing room.
- The supporting copy is a sentence or two — not a paragraph.

## When not to use

- The hero needs immersive media (use a media-led hero instead — coming).
- You need three or more CTAs (use a CTA-rich hero variant).

## Props

| Prop | Type | Default |
|---|---|---|
| `headline` | string | "A bold hero, split clean down the middle." |
| `supporting` | string | "Drop a line of supporting copy here…" |
| `primaryCta` | `{ label, href }` | `{ Primary, # }` |
| `secondaryCta` | `{ label, href }` | `{ Secondary, # }` |
| `position` | number | injected by `<SectionsContainer>` |

## Motion

Static at `motion.density = minimal`. At `restrained`, the headline reveals on viewport entry with a 24px y-offset over `--duration-slow` ease-out. No motion file shipped — the host project's reveal defaults handle it.

## Responsive

- Mobile: single column, headline above supporting copy.
- Tablet+: 7 / 5 column split. Supporting copy column self-aligns to the bottom of the headline column for visual rhythm.

## Tokens consumed

- Colour: `bg-surface`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `bg-accent`, `text-accent-fg`, `bg-accent-hover`, `border-border`, `border-border-strong`.
- Typography: `text-label-small`, `text-heading-1`, `text-heading-2`, `text-body-large`, `text-button-large`, `font-display`, `font-mono`.
- Rhythm: `py-section-lg`.
- Layout: standard structural utilities (`flex`, `col-span-*`, `gap-*`, `space-y-*`, `md:`).
- Motion: `duration-fast`, `ease-standard` for hover transitions.

No hard-coded colours, no arbitrary font sizes, no `font-family` declarations. Adapts cleanly to any starter-pack-derived project.
