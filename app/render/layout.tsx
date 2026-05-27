/**
 * /render/* layout — bare section shell.
 *
 * Loads only the neutral design system (tokens + theme) and Tailwind. No
 * marketplace chrome, no header, no footer — the iframe content is JUST
 * the section against the baseline tokens. The honest "what this layout
 * looks like, brand-stripped."
 *
 * MotionProvider installs the canonical-stack runtime (GSAP defaults +
 * Lenis singleton wired to the ScrollTrigger ticker) so sections feel the
 * same here as they do in any client project (Atlas, demos). Without it,
 * scroll-driven sections still scrub but lose Lenis's smoothing layer.
 *
 * Scoped CSS imports here keep the design-system tokens OUT of the rest
 * of the marketplace app — `:root` in `tokens.css` would otherwise collide
 * with chrome variables. Next.js still flattens all imports into the
 * global CSS bundle, but the visual isolation is enforced by the route
 * boundary in practice — only `/render/*` pages mount this layout.
 *
 * `@mr/canonical-stack/styles.css` is REQUIRED here. It defines the
 * `[data-mr-reveal]` CSS-driven entrance animation that `useReveal()` in
 * sections relies on — useReveal flips `data-mr-revealed="true"` but does
 * NOT register a GSAP tween; the animation is a pure CSS transition driven
 * by these stylesheet rules. Without this import, useReveal calls are no-ops.
 * It also ships the Lenis global utility classes (`html.lenis`, `.lenis-smooth`)
 * the MotionProvider's Lenis singleton depends on for correct scroll layout.
 * Halden's `app/layout.tsx` imports the same file — keeping the render shell
 * byte-identical to the origin project.
 */

import { MotionProvider } from "@/components/motion-provider";
import "@mr/canonical-stack/styles.css";
import "@mr/section-editors/styles.css";
import "dialkit/styles.css";
import "./render.css";

export const metadata = {
  title: "Section preview",
};

export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
