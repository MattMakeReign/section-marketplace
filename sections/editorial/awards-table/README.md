# Awards Table

Centred heading above a three-column table with hairline row dividers and a double-weight header border. Built for awards, press features, recognitions, or any structured record where uniform rows need deliberate typographic weight.

## When to use

- The page needs to surface a structured list of awards, press mentions, or recognition records where each row shares identical shape (e.g. year · outlet · title).
- An editorial or restrained tone is required — hairline dividers and typographic hierarchy carry the weight without imagery.
- The record count is medium (5–20 rows); enough to warrant a table rather than a card grid, not so many that pagination is needed.
- Placement mid-page to substantiate credibility after an intro or hero section.

## When not to use

- Records have unequal column shapes or require rich content per row (images, long body copy, nested data) — use a card grid or editorial list instead.
- Fewer than 3 rows exist; a simple list or inline callout is more proportionate.
- The page tone is playful or maximalist — the hairline-divider aesthetic will feel out of register.
- A filterable or sortable data table is needed; this layout has no interactive data controls.

## Props

| Prop | Type | Default |
|---|---|---|
| _… fill in …_ | | |

## Motion

Density: restrained.

## Responsive

desktop / mobile-stacked.

## Tokens consumed

- Colour: _list the design-system colour tokens this section uses._
- Typography: _list the role-based type tokens this section uses._
- Rhythm: _list the spacing / section-padding tokens._

## Adaptation notes

- **Tokens to change per project:** heading typeface and size, divider colour and weight, row text size, background colour (currently off-white).
- **Column labels:** replace default header strings (e.g. Year / Publication / Award) with project-specific vocabulary without altering column count.
- **Row count:** the scroll-reveal entrance is calibrated for ~8–15 rows; adjust stagger duration if row count deviates significantly.
- **Structural constants:** three-column layout, centred heading, double-weight header border, and hairline row dividers are load-bearing — do not collapse to one column on desktop.
- **Mobile:** on narrow viewports the table should either allow horizontal scroll or reflow each row into a stacked label/value pair; confirm which behaviour is implemented before deploying.

## Failure modes

- Heading breaks to three or more lines at mobile widths if the heading string exceeds ~40 characters — keep heading copy concise.
- Very long cell strings (e.g. verbose award titles) cause uneven column widths and break the grid rhythm — truncate or cap cell copy.
- More than ~25 rows makes the section disproportionately tall and the scroll-reveal stagger feels slow — paginate or filter at that scale.
- If the host page has a dark background, hairline dividers at default opacity may vanish — divider colour must be swapped explicitly.
- Three-column structure assumes roughly equal content weight per column; a column that is consistently near-empty (e.g. year as a 4-digit number vs. a long title) creates awkward whitespace.
