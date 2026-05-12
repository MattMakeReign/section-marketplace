/**
 * /render/* layout — bare section shell.
 *
 * Loads only the neutral design system (tokens + theme) and Tailwind. No
 * marketplace chrome, no header, no footer — the iframe content is JUST
 * the section against the baseline tokens. The honest "what this layout
 * looks like, brand-stripped."
 *
 * Scoped CSS imports here keep the design-system tokens OUT of the rest
 * of the marketplace app — `:root` in `tokens.css` would otherwise collide
 * with chrome variables. Next.js still flattens all imports into the
 * global CSS bundle, but the visual isolation is enforced by the route
 * boundary in practice — only `/render/*` pages mount this layout.
 */

import "./render.css";

export const metadata = {
  title: "Section preview",
};

export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
