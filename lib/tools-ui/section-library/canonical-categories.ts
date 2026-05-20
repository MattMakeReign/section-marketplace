/**
 * Canonical Section Library categories.
 *
 * **Single source of truth** for the categories shown in the Section Library
 * filter rail, in the curator's edit form, and in any submission tooling that
 * wants to suggest a canonical bucket.
 *
 * Design rules:
 * - Submission is **free-form** — designers can ship a section with any
 *   `category` string that fits their project's vocabulary.
 * - **Promotion is canonical** — the curator picks one of these 16 when they
 *   approve a section into the Library. The curator form constrains the
 *   choice; the schema does not (so submitting can never fail on category).
 *
 * Two kinds of sections live here:
 * - **Page sections** — body content that appears on one or more routes
 *   (`Hero`, `Features`, `Work`, etc.). These are the bulk of submissions.
 * - **Persistence sections** — global chrome that persists across every page
 *   (`Navigation`, `Footer`). Designers install these once during initial
 *   project setup.
 */

export type CanonicalCategoryId =
  | "hero"
  | "intro"
  | "features"
  | "services"
  | "process"
  | "work"
  | "testimonials"
  | "logos"
  | "stats"
  | "team"
  | "faq"
  | "pricing"
  | "contact"
  | "cta"
  | "navigation"
  | "footer";

export type CanonicalCategory = {
  id: CanonicalCategoryId;
  label: string;
  /** Where in the page this kind of section typically lives. */
  kind: "page" | "persistence";
  /** Short hint for curator picker. */
  hint: string;
};

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  { id: "hero",         label: "Hero",         kind: "page",        hint: "Opening section, anchors the route." },
  { id: "intro",         label: "Intro",        kind: "page",        hint: "About, manifesto, brand-story paragraphs." },
  { id: "features",      label: "Features",     kind: "page",        hint: "Value props, capability grids, tabs/marquees of." },
  { id: "services",      label: "Services",     kind: "page",        hint: "Discipline / offering breakdowns. Agency vocab." },
  { id: "process",       label: "Process",      kind: "page",        hint: "Steps, how-we-work, methodology." },
  { id: "work",          label: "Work",         kind: "page",        hint: "Portfolio, case studies, project grids." },
  { id: "testimonials",  label: "Testimonials", kind: "page",        hint: "Quotes, praise, social proof." },
  { id: "logos",         label: "Logos",        kind: "page",        hint: "Client / partner brand strips." },
  { id: "stats",         label: "Stats",        kind: "page",        hint: "Credibility numbers, big-figure callouts." },
  { id: "team",          label: "Team",         kind: "page",        hint: "People, bios, headshots." },
  { id: "faq",           label: "FAQ",          kind: "page",        hint: "Accordion / list of common questions." },
  { id: "pricing",       label: "Pricing",      kind: "page",        hint: "Plans, tiers, comparison tables." },
  { id: "contact",       label: "Contact",      kind: "page",        hint: "Forms, contact details, get-in-touch blocks." },
  { id: "cta",           label: "CTA",          kind: "page",        hint: "Pre-footer / mid-page call-to-action band." },
  { id: "navigation",    label: "Navigation",   kind: "persistence", hint: "Global header / nav. Persists across pages." },
  { id: "footer",        label: "Footer",       kind: "persistence", hint: "Global footer. Persists across pages." },
];

export const CANONICAL_IDS: CanonicalCategoryId[] = CANONICAL_CATEGORIES.map(c => c.id);

export function getCanonicalCategory(id: string): CanonicalCategory | undefined {
  return CANONICAL_CATEGORIES.find(c => c.id === id);
}

export function isCanonicalCategory(id: string): id is CanonicalCategoryId {
  return (CANONICAL_IDS as string[]).includes(id);
}

/**
 * Best-effort fuzzy match — turns a free-form designer category like
 * "editorial" or "how-we-work" into a suggested canonical category id.
 * Returns undefined when there's no confident match.
 */
export function suggestCanonical(raw: string): CanonicalCategoryId | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  // Direct hit.
  if (isCanonicalCategory(s)) return s;
  // Common alias map.
  const aliases: Record<string, CanonicalCategoryId> = {
    editorial: "intro",
    manifesto: "intro",
    about: "intro",
    story: "intro",
    feature: "features",
    benefits: "features",
    capabilities: "features",
    "how-it-works": "process",
    "how-we-work": "process",
    steps: "process",
    portfolio: "work",
    "case-studies": "work",
    projects: "work",
    quotes: "testimonials",
    testimonial: "testimonials",
    praise: "testimonials",
    "logo-list": "logos",
    brands: "logos",
    partners: "logos",
    "numbers": "stats",
    credibility: "stats",
    people: "team",
    bios: "team",
    questions: "faq",
    plans: "pricing",
    tiers: "pricing",
    form: "contact",
    "contact-form": "contact",
    "get-in-touch": "contact",
    "call-to-action": "cta",
    "cta-band": "cta",
    nav: "navigation",
    header: "navigation",
    navbar: "navigation",
  };
  if (aliases[s]) return aliases[s];
  // Substring fallback — "hero-split-bold" → "hero".
  for (const c of CANONICAL_CATEGORIES) {
    if (s.startsWith(c.id) || s.endsWith(c.id)) return c.id;
  }
  return undefined;
}
