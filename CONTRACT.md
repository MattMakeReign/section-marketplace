# Section Adaptation Contract

> The marketplace is **layout-first, not styling-first.** A submitted section must inherit *every* visual decision from the consuming project. This contract is what makes that possible — and what `pnpm validate` enforces on every PR.

## Rule of thumb

If a section hard-codes anything that should bend to the project (colour, type, spacing rhythm, font family, motion timing literal), the section breaks adaptation. Use the project's tokens or a token-mapped utility instead.

If you genuinely need to escape the contract for a single token, append `// mr-marketplace-allow` (or `/* mr-marketplace-allow */` for CSS) on the same line. Use it sparingly — every escape is a place where the section won't fully adapt to the consuming project.

## What sections MAY consume

- **Content tokens** — semantic CSS custom properties exposed by the project's `design-system/tokens.css`:
  - Colour: `--surface`, `--surface-muted`, `--surface-elevated`, `--surface-inverse`, `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-inverse`, `--border`, `--border-strong`, `--accent`, `--accent-fg`, `--accent-hover`, `--danger`, `--success`, `--warning`.
  - Role-based typography: `--text-heading-0..6`, `--text-body-large/medium/small`, `--text-button-large/small`, `--text-label-large/small` (each carries `--…--line-height`, `--…--letter-spacing`, `--…--font-weight` sub-tokens).
  - Section rhythm: `--section-py-{sm,md,lg,xl}`.
  - Grid: `--grid-max`, `--grid-columns`, `--grid-gutter`, `--grid-margin`, `--breakpoint-{sm,md,lg,xl,2xl}`.
  - Motion: `--duration-{instant,fast,base,slow,deliberate}`, `--ease-{standard,out,in,in-out}`, `--motion-density-multiplier`, `--motion-distance-{sm,md,lg}`.
  - Radii / shadow / spacing scales — `--radius-*`, `--shadow-*`, `--space-*`.
- **Token-mapped Tailwind utilities** — `bg-surface`, `text-fg`, `text-heading-1`, `py-section-lg`, `border-border`, `rounded-md`, etc. Standard structural utilities (`flex`, `grid`, `col-span-*`, `gap-*`, `items-center`, responsive prefixes) are also fine.
- **Foundational components imported from the consuming project** — `Section`, `SectionGrid`, `Heading`, `Body`, `Button`, etc. via `@/components/...`. Sections compose these; they do not bundle their own copies.
- **GSAP** for motion. Already a starter-pack dependency.

## What sections MUST NOT do

| ✗ | Why |
|---|---|
| Use chrome tokens (`var(--chrome-*)`) | Chrome is the MakeReign tooling UI surface (explorer, workspace shell, comment UI). It is intentionally static and never repaints when content tokens change. Mixing chrome and content variables is a code-review failure. |
| Hard-code colour literals — `#1a1a1a`, `rgb(…)`, `rgba(…)`, `hsl(…)`, `hsla(…)` | The colour palette is a project decision. Use `var(--…)` or a token-mapped utility. |
| Use Tailwind arbitrary colour values — `bg-[#fff]`, `text-[rgb(0,0,0)]` | Same reason as above. |
| Hard-code font-family — `font-family: …`, `font-["…"]` | Typography is a project decision. The project supplies `--font-display`, `--font-body`, `--font-mono` via tokens. |
| Hard-code font sizes via arbitrary utilities — `text-[24px]`, `text-[1.5rem]` | Use a role token: `text-heading-1`, `text-body-large`, `text-button-large`, `text-label-small`. |

## Section structure

Every section is wrapped in `<Section>` (edge-to-edge of the viewport). All horizontal layout lives inside `<SectionGrid>` (the centred 12-column grid). Backgrounds and vertical padding go on `<Section>`; column spans go on the children of `<SectionGrid>`. Imported from `@/components/section` and `@/components/section-grid` — never re-implemented inside a section.

## Identity

Each rendered section carries `data-section-id="<stable-slug>"` so the workspace-shell overlay (`S` / `G` keys) and AI agents can refer to it as "Section 03 hero-split-bold". The positional number is assigned by the consuming project's section registry; the stable slug is the section's marketplace `id`. Both are required.

## Validation

`pnpm validate` runs three checks per submitted section. Any failure exits non-zero and blocks the merge.

1. **Schema** — `section.json` matches `schemas/section.schema.json`.
2. **Required files** — `section.json`, `index.tsx`, `preview.png`, `README.md` all present. Folder slug matches `id`.
3. **Adaptation lint** — `scripts/lint-adaptation.ts` scans every `.tsx`, `.ts`, `.css` file inside the section and flags violations against the rule table above. Findings are reported with file, line, column, rule name, and the matched string.

### Opt-out

Append `// mr-marketplace-allow` (`/* mr-marketplace-allow */` for CSS) on the offending line. Reviewers should push back on every escape during PR review.

### Rule reference

| Rule | Catches |
|---|---|
| `no-chrome-tokens` | `var(--chrome-*)` references |
| `no-hex-colors` | Hex literals — `#fff`, `#1a1a1a`, `#1a1a1aff` |
| `no-rgb-or-hsl-colors` | `rgb()`, `rgba()`, `hsl()`, `hsla()` calls |
| `no-arbitrary-color-utilities` | Tailwind arbitrary colour values — `bg-[#…]`, `text-[rgb(…)]` |
| `no-arbitrary-font-size` | Tailwind arbitrary font sizes — `text-[24px]`, `text-[1.5rem]` |
| `no-font-family-declaration` | `font-family:` declarations in any source file |
| `no-arbitrary-font-family-utility` | `font-[…]` arbitrary Tailwind utilities |
