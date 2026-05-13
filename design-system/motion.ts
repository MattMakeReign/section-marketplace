/*
 * motion.ts — minimal canonical-stack contract for the marketplace previewer.
 *
 * The marketplace is a host for sections from the canonical stack
 * (`decision-canonical-section-stack`). Sections may `import "@/design-system/motion"`
 * defensively to guarantee GSAP plugins are registered at module-evaluation
 * time — before any child component's `useEffect` runs.
 *
 * This file exists so that import resolves in the marketplace's preview
 * environment. It does NOT install the full motion runtime (durations,
 * density tiers, helpers) — that's a project-level concern. Here we only
 * need plugin registration, so a freshly-rendered section can create
 * ScrollTriggers without the "Missing plugin?" warning.
 *
 * For full canonical-stack runtime, see `repos/starter-pack/design-system/motion.ts`.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}
