# Brand Contexts

Brand contexts are first-class entities in the Section Library. Each context is a versioned bundle of design-system inputs (tokens, role-based typography, fonts, brand assets) that a section was authored against.

**Why:** sections live in the library as *examples of taste applied to a brand*, not as neutral templates. A section authored in the Acme client project should render in the Library App looking like Acme — not like the marketplace's default. When that same section is installed into a different client project, only the section component travels — the destination's tokens take over (principle #4 preserved).

See `decision-section-brand-contexts.md` in the workspace tracker for the full architecture.

## Shape

Each context lives in its own directory:

```
brand-contexts/
  _neutral/           # special — the marketplace baseline. No tokens.css; defers to global :root in design-system/tokens.css.
    context.json
    assets/
  mr-atlas/           # an example brand context
    context.json
    tokens.css        # scoped to [data-section-context="mr-atlas"]
    fonts.css         # @font-face + @import (global — fonts can't be scoped by spec)
    assets/
  index.json          # auto-generated index of all contexts
```

## `context.json` schema

```json
{
  "id": "mr-atlas",
  "name": "MakeReign Atlas",
  "version": "1.0.0",
  "description": "Atlas — MakeReign's flagship demo project. Editorial + cool-tech palette.",
  "author": "techo",
  "originatingProject": "atlas",
  "created": "2026-05-13",
  "updated": "2026-05-13",
  "status": "active",
  "tokensHash": "sha256-…",
  "sectionsUsing": ["section-id-1", "section-id-2"]
}
```

- `id` matches the directory name. Lowercase, hyphenated.
- `version` follows semver. Float-vs-pin is determined by how a section references the context (see below).
- `tokensHash` is a SHA-256 over the normalized tokens payload — used by the submit flow to detect drift.
- `sectionsUsing` is regenerated at build time.

## Versioning — float vs pin

Resolved 2026-05-13 as Option C (default float, opt-in pin):

- A section's `section.json` referencing `"context": "mr-atlas"` → **floats** to the latest version.
- A section's `section.json` referencing `"context": "mr-atlas@1.0.0"` → **pins** to that version.

The resolver in `lib/brand-contexts.ts` handles both shapes.

## Scoping rules

The CSS in `tokens.css` is **scoped to a wrapper selector** at the top of the file:

```css
[data-section-context="mr-atlas"] {
  --surface: #fafaf7;
  --fg: #111;
  /* … */
}
```

The marketplace's `/render/[id]` page wraps the section in `<div data-section-context="mr-atlas">`, so CSS variables cascade from the wrapper to the section's children. Tailwind utilities (`bg-surface`, `text-fg`, etc.) generated from `@theme` in the global `design-system/theme.css` resolve those variables at runtime, so the section renders against the context's values without needing a separate Tailwind build per context.

Fonts (`@font-face` declarations) are global by CSS spec — can't be scoped. Keep `font-family` names unique per context to avoid collisions.

## `_neutral` is special

`_neutral/context.json` exists for completeness and indexing, but `_neutral` has **no `tokens.css`** — sections with `context: null` (or `context: "_neutral"`) inherit the marketplace's default `:root` from `design-system/tokens.css` exactly as before. The render page treats `null` and `_neutral` identically.
