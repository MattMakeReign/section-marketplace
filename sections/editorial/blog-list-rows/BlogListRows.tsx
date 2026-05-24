"use client";

/**
 * BlogListRows — editorial blog index.
 *
 * Layout:
 *   - Top: eyebrow pill + Plex Serif H1 ("Blog & Insights"), left-aligned.
 *   - Body: vertical stack of post anchors. Each anchor is a 3-column grid:
 *       1. image (tall, with hover-reveal "Read now" overlay)
 *       2. title + meta row (category | date)
 *       3. body excerpt
 *     Below md the grid collapses to a single column.
 *   - Hairline divider above the first card + below each card.
 *
 * Halden Miller flavour:
 *   - Parchment cream surface; midnight-ink type.
 *   - H1 at heading-1 (Plex Serif 64/72, weight 400, italic-emphasis-ready).
 *   - Card titles at heading-5 (24px Plex Serif).
 *   - Mono uppercase category + date pair via heading-6 (12px mono token).
 *   - "Read now" reveal button: midnight-ink fill, parchment glyph, soft pill.
 *
 * Motion (canonical stack — `useReveal` from @mr/canonical-stack):
 *   - Header reveals as a single block on scroll-in.
 *   - Cards stagger-reveal at 100ms step when the list enters viewport.
 *   - "Read now" overlay fade uses Tailwind `group-hover:opacity-100` — pure
 *     CSS, no JS state per card.
 */

"use client";

import { useReveal } from "@mr/canonical-stack";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

const SECTION_ID = "blog-list-rows";
const assetUrl = (filename: string) => `/api/section-asset/${SECTION_ID}/${filename}`;

// ───────────────────────────────────────────────────────────────
// Post data
// ───────────────────────────────────────────────────────────────

export type Post = {
  image: string;
  filename: string;
  alt: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  href: string;
};

export const DEFAULT_POSTS: Post[] = [
  {
    image: assetUrl("01-leadership.jpg"),
    filename: "01-leadership.jpg",
    alt: "Portrait of a professional in soft natural light.",
    title:
      "The language of leadership in times of change — what tone, cadence and clarity reveal about a brand",
    category: "Insights",
    date: "September 20, 2025",
    excerpt:
      "When an organisation is mid-transition, every sentence becomes a signal. We trace how leadership voices either compound trust or quietly erode it — across the boardroom, the all-hands and the press release — and why the smallest editorial choices carry the most weight.",
    href: "#",
  },
  {
    image: assetUrl("02-structure.jpg"),
    filename: "02-structure.jpg",
    alt: "Group meeting in a sunlit modern office.",
    title:
      "Structure before style — a senior consultant's view on communication under pressure",
    category: "Field notes",
    date: "August 14, 2025",
    excerpt:
      "Why we build the skeleton before we write the headline, and how a clear underlying logic makes the difference between a deck that lands and one that drifts. Notes from twenty years of helping leadership teams find their argument when the deadline is already past.",
    href: "#",
  },
  {
    image: assetUrl("03-restructure.jpg"),
    filename: "03-restructure.jpg",
    alt: "Workspace with a laptop and editorial layout.",
    title:
      "Restructuring without losing the story — realigning a financial-services firm during a downsize",
    category: "Case study",
    date: "July 02, 2025",
    excerpt:
      "Inside a six-month engagement helping a 40-year-old financial-services firm rebuild its narrative through a 22% headcount reduction. How a messaging architecture that started in the boardroom reached every customer touchpoint — and why the staff letter came first.",
    href: "#",
  },
  {
    image: assetUrl("04-crisis.jpg"),
    filename: "04-crisis.jpg",
    alt: "Professional working at a sun-lit desk.",
    title:
      "From crisis to credibility — supporting a tech company under regulatory scrutiny",
    category: "Case study",
    date: "May 28, 2025",
    excerpt:
      "When the headlines turned, the team had nine days. A communication playbook covering analyst calls, employee briefings, customer letters and the long arc of public statements — and the editorial choices that turned a reputational moment into renewed trust eighteen months later.",
    href: "#",
  },
  {
    image: assetUrl("05-reputation.jpg"),
    filename: "05-reputation.jpg",
    alt: "Hands on a laptop during a collaborative session.",
    title:
      "Reputation is built in the small moments — why the email and the all-hands matter more than the keynote",
    category: "Essay",
    date: "April 09, 2025",
    excerpt:
      "The choices we make in everyday communication compound. Mindful sentences in the unglamorous channels — the Tuesday update, the Slack reply, the routine board pre-read — build deeper trust than any keynote could. A short essay on the durable, unsexy mechanics of credibility.",
    href: "#",
  },
];

// ───────────────────────────────────────────────────────────────
// Card
// ───────────────────────────────────────────────────────────────

function BlogCard({ post, imageRadiusPx }: { post: Post; imageRadiusPx: number }) {
  return (
    <a
      data-blog-card
      data-mr-reveal
      href={post.href}
      className="group grid grid-cols-3 gap-6 border-b pb-6 no-underline transition-colors duration-base ease-standard max-md:grid-cols-1 max-md:gap-3 max-md:pb-4"
      style={{
        borderColor:
          "color-mix(in srgb, var(--color-midnight-ink) 16%, transparent)",
        color: "var(--fg)",
      }}
    >
      {/* Mobile / tablet meta row — category (left) + date (right).
          Visible only below md, where the card stacks. Sits at the top of
          the stack so the eyebrow + date read like a magazine slug above
          the headline. Hidden at md+ where the two values live in their
          respective columns instead. */}
      <div
        className="hidden flex-row items-center justify-between gap-4 max-md:order-1 max-md:flex"
      >
        <span
          className="text-heading-6 font-mono uppercase"
          style={{ color: "var(--fg)" }}
        >
          {post.category}
        </span>
        <span
          className="text-heading-6 font-mono uppercase"
          style={{
            color:
              "color-mix(in srgb, var(--color-midnight-ink) 64%, transparent)",
          }}
        >
          {post.date}
        </span>
      </div>

      {/* Column 1 — image with hover overlay. Height shrinks step-wise
          on tablet + mobile to keep the row from going too tall once the
          card stacks to a single column below md. On stacked layout the
          image moves AFTER the title via `order-3`. */}
      <div
        className="relative h-[340px] w-full overflow-hidden max-md:order-3 max-md:h-[300px] max-sm:h-[240px]"
        style={{ borderRadius: imageRadiusPx }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.alt}
          loading="lazy"
          className="absolute inset-0 z-[1] h-full w-full object-cover transition-transform duration-700 ease-standard group-hover:scale-[1.03]"
        />

        {/* Hover overlay — fades in with "Read now" pill */}
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center opacity-0 transition-opacity duration-base ease-standard group-hover:opacity-100">
          <div
            className="inline-flex items-center justify-center rounded-cards-large px-4 py-3"
            style={{
              backgroundColor: "var(--color-midnight-ink)",
              color: "var(--color-parchment-cream)",
              border:
                "1px solid color-mix(in srgb, var(--color-parchment-cream) 8%, transparent)",
              boxShadow:
                "0 -1px 0 0 color-mix(in srgb, var(--color-parchment-cream) 16%, transparent), 0 1px 0 0 color-mix(in srgb, var(--color-parchment-cream) 8%, transparent)",
            }}
          >
            <span
              className="text-button-large"
              style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
            >
              Read now
            </span>
          </div>
        </div>
      </div>

      {/* Column 2 — title + category (date moved to far right of the card).
          `pr-12` insets the right edge of the title's text area so titles
          wrap a beat earlier than the column width — keeps the editorial
          rhythm tight and stops long headlines crashing into the excerpt
          column. Padding drops at mobile when the card stacks.
          On stacked: sits at order-2, BELOW the mobile meta row but ABOVE
          the image. The duplicate desktop category label hides on stacked. */}
      <div className="flex flex-col justify-between gap-6 pr-12 max-md:order-2 max-md:gap-3 max-md:pr-0">
        <h3 className="m-0 text-heading-5 font-display text-fg">
          {post.title}
        </h3>
        <span
          className="text-heading-6 font-mono uppercase max-md:hidden"
          style={{ color: "var(--fg)" }}
        >
          {post.category}
        </span>
      </div>

      {/* Column 3 — excerpt + date pinned bottom-right.
          Date sits at the far right edge of the entire card so the
          chronology reads down the right margin of the list.
          On stacked: order-4 (last), and the desktop date label hides
          because the mobile meta row at the top already carries it. */}
      <div className="flex flex-col justify-between gap-6 max-md:order-4 max-md:gap-3">
        <p
          className="m-0 text-body-medium"
          style={{
            color:
              "color-mix(in srgb, var(--color-midnight-ink) 64%, transparent)",
            fontFamily: "var(--font-body)",
          }}
        >
          {post.excerpt}
        </p>
        <span
          className="text-heading-6 font-mono uppercase self-end text-right max-md:hidden"
          style={{
            color:
              "color-mix(in srgb, var(--color-midnight-ink) 64%, transparent)",
          }}
        >
          {post.date}
        </span>
      </div>
    </a>
  );
}

// ───────────────────────────────────────────────────────────────
// Section
// ───────────────────────────────────────────────────────────────

export type BlogListRowsProps = {
  position?: number;
  headlineAlign?: "left" | "center" | "right";
  rowLimit?: number;
  /** Vertical gap between rows (px). */
  rowGapPx?: number;
  /** Thumbnail corner radius (px). */
  imageRadiusPx?: number;
  /** Posts — managed via MediaManager in editor.tsx. */
  posts?: Post[];
};

export function BlogListRows({
  position,
  headlineAlign = "left",
  rowLimit,
  rowGapPx = 24,
  imageRadiusPx = 8,
  posts: postsProp,
}: BlogListRowsProps = {}) {
  const posts = postsProp ?? DEFAULT_POSTS;
  // Canonical scroll-in reveal — see `useReveal` in @mr/canonical-stack.
  // Header reveals as a single block; cards stagger-reveal at 100ms step
  // when the first row enters the viewport.
  const headerRef = useReveal<HTMLDivElement>();
  const listRef = useReveal<HTMLDivElement>({
    selector: "[data-blog-card]",
    stagger: 100,
  });

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg bg-surface"
    >
      <SectionGrid>
        <div
          ref={headerRef}
          data-mr-reveal
          className={`col-span-12 mb-16 flex flex-col gap-6 max-md:mb-12 max-md:gap-4 ${
            headlineAlign === "center" ? "items-center text-center mx-auto"
            : headlineAlign === "right" ? "items-end text-right ml-auto"
            : "items-start text-left"
          }`}
        >
          <div
            className="inline-flex w-fit items-center justify-center rounded-tags px-2 py-1"
            style={{ backgroundColor: "var(--color-pressed-linen)" }}
          >
            <span className="text-label-small font-mono uppercase tracking-wider" style={{ color: "var(--fg)" }}>
              Blog
            </span>
          </div>

          <h1 className="m-0 text-heading-1 font-display text-fg max-md:text-heading-2">
            Blog &amp; <em>insights</em>
          </h1>
        </div>

        {/* Post list — top hairline + vertical stack of card anchors */}
        <div
          ref={listRef}
          className="col-span-12 flex flex-col border-t pt-6 max-md:pt-4"
          style={{
            borderColor:
              "color-mix(in srgb, var(--color-midnight-ink) 16%, transparent)",
            gap: rowGapPx,
          }}
        >
          {(rowLimit ? posts.slice(0, rowLimit) : posts).map((post) => (
            <BlogCard key={post.title} post={post} imageRadiusPx={imageRadiusPx} />
          ))}
        </div>
      </SectionGrid>
    </Section>
  );
}