# Awards Table

Centred heading above a three-column table with hairline row dividers and a double-weight header border. Designed for awards, press features, recognitions, or any structured record where uniform rows need deliberate typographic treatment.

## When to use

- The page needs to surface a list of awards, press mentions, recognitions, or any fixed-schema records where each entry shares the same three data points (e.g. year, title, publisher).
- A typographically restrained, editorial tone is required — no cards, no imagery, just structured text rows.
- The section sits mid-page as a supporting proof point after an intro or stats block.
- Scroll-reveal entrance is desired to bring rows in without heavy animation.

## When not to use

- Records have more than three columns or highly variable row shapes — a more flexible data table component is needed.
- The list is fewer than three rows; a simple bullet list or inline mention is less heavy-handed.
- The page tone is playful or maximalist — hairline-divider tables read as cold in those contexts.
- Imagery or logos per row are required (e.g. publication logos); this layout has no image slot.

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

- **Tokens to change per project:** typeface, font size scale, divider colour, heading weight, background colour (off-white in scaffold).
- **Column labels** (e.g. Year / Award / Organisation) should be updated to match the actual record schema — the three-slot structure is fixed but labels are free-form.
- **Row count** is variable; the scroll-reveal stagger timing may need adjustment beyond ~12 rows to avoid feeling slow.
- **Mobile:** on narrow viewports the three columns should stack or collapse to a definition-list pattern — verify the responsive treatment matches the brand's mobile typographic scale.

## Failure modes

- Heading lines exceeding ~40 characters will break the centred single-line assumption and may need left-alignment or a tighter max-width.
- Very long cell strings (e.g. award titles > 60 chars) cause uneven row heights that disrupt the grid rhythm — apply line-clamp or truncation.
- If the table is placed at the very top of a page the scroll-reveal entrance may never trigger on short screens — ensure an offset threshold or use an in-view alternative.
- More than ~20 rows without pagination or a 'show more' toggle makes the section disproportionately tall on mobile.
