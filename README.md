# MakeReign Section Marketplace

A Git-backed registry of reusable, design-system-adaptive sections.

The marketplace is **layout-first, not styling-first**. Every section here renders only against the consuming project's `design-system/` tokens — drop the same Hero into two visually distinct projects and each one looks like it belongs there, automatically.

## How it works

- One folder per section. Each folder has a `section.json` manifest, the React component, an optional motion file, a static `preview.png`, and an AI-readable `README.md`.
- A generated `index.json` at the repo root lists every section. The `mr` CLI reads this manifest to power `mr list` and `mr add <section-id>`.
- "Auth" is repo-gated: clone access = use rights, PR access = submission, merge on `main` = curation.

## Folder layout

```
section-marketplace/
├── README.md                   this file
├── CONTRACT.md                 the design-system adaptation contract
├── index.json                  generated — do not edit
├── package.json
├── tsconfig.json
├── schemas/
│   └── section.schema.json     JSON schema for section.json
├── scripts/
│   ├── build-manifest.ts       walks sections/, validates, writes index.json
│   └── validate.ts             schema validation + adaptation lint
├── previews/                   shared preview assets (rare)
└── sections/
    ├── hero/
    ├── intro/
    ├── carousel/
    ├── testimonials/
    ├── gallery/
    ├── features/
    ├── forms/
    ├── cta/
    ├── footer/
    └── navigation/
```

Each section lives at `sections/<category>/<section-slug>/`:

```
sections/hero/hero-split-bold/
├── section.json     id, name, category, version, props schema, motion density, …
├── index.tsx        the component
├── styles.css       optional, section-local
├── motion.ts        optional, GSAP timeline
├── preview.png      static preview, 1440 × N
└── README.md        AI-readable description, prop notes, motion notes
```

## V1 categories

| Slug             | Use                                                           | V1 must-have |
|------------------|---------------------------------------------------------------|--------------|
| `hero`           | Above-the-fold opening section                                | ✓            |
| `intro`          | Mission / introductory copy block                             | ✓            |
| `carousel`       | Slide-based content (testimonials, projects, imagery)         | ✓            |
| `testimonials`   | Quote / endorsement layouts                                   | ✓            |
| `forms`          | Contact, signup, multi-step inputs                            | ✓            |
| `footer`         | Site-wide footer                                              | ✓            |
| `gallery`        | Image grids, masonry layouts, project showcases               | stretch      |
| `features`       | Feature grids, capability lists                               | stretch      |
| `cta`            | Conversion-oriented call-to-action bands                      | stretch      |
| `navigation`     | Site headers and nav patterns                                 | stretch      |

The numbering order in the canonical section-identity scheme follows the glossary (Hero = 03, Intro = 04, …). See `decision-section-identity` in the planning workspace for the full mapping.

## Local development

```sh
pnpm install
pnpm validate    # schema-validate every section.json
pnpm build       # regenerate index.json
```

CI runs `pnpm validate` on every PR. The pre-merge check rebuilds `index.json` so the manifest is always in sync with `main`.

## Submitting a section

1. Branch off `main`.
2. Create `sections/<category>/<your-section-slug>/` with `section.json`, `index.tsx`, `preview.png`, `README.md`.
3. Run `pnpm validate` locally — fix anything it complains about.
4. Open a PR. CI runs validation. Reviewer merges = section is published.

The full submission lifecycle (Draft / Submitted / In Review / Approved / Promoted / Deprecated / Archived) ships in Phase 5. For now, repo merge = approved.

## Out of scope (V1)

- Hosted API or CDN — `index.json` lives in Git.
- Visual marketplace overlay — Phase 3 (Browser Workspace).
- Curation UI, submission lifecycle states — Phase 5.
- Public marketplace, analytics, monetisation, recommendations.
