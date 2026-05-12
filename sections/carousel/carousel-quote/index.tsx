import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type QuoteItem = {
  quote: string;
  attribution: string;
  role?: string;
};

export type CarouselQuoteProps = {
  position?: number;
  eyebrow?: string;
  items?: QuoteItem[];
};

const DEFAULT_ITEMS: QuoteItem[] = [
  {
    quote:
      "They reframed the brief in the first conversation. By the second meeting we had a clearer narrative than we'd had in two years.",
    attribution: "Sara Lin",
    role: "VP Brand, Holloway",
  },
  {
    quote:
      "Calm, fast, opinionated. The team made decisions where most agencies hand you options.",
    attribution: "Marcus Reuter",
    role: "Founder, Field Notes",
  },
  {
    quote:
      "Six weeks from kickoff to a site that finally sounds like us. The strategy carried through every page.",
    attribution: "Imogen Park",
    role: "Head of Marketing, Crane Studio",
  },
];

export function CarouselQuote({
  position,
  eyebrow = "Praise",
  items = DEFAULT_ITEMS,
}: CarouselQuoteProps) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-md bg-surface-muted text-fg"
    >
      <SectionGrid>
        <div className="col-span-12 mb-10 flex items-baseline justify-between">
          <p className="text-label-small uppercase text-fg-subtle font-mono">
            Section {String(position ?? 0).padStart(2, "0")} · {eyebrow}
          </p>
          <p className="text-label-small text-fg-subtle font-mono hidden md:block">
            Scroll →
          </p>
        </div>
      </SectionGrid>

      <div
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory md:snap-proximity scroll-px-6 px-6 md:px-12 pb-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((item, idx) => (
          <article
            key={idx}
            className="snap-center shrink-0 w-[min(85vw,560px)] min-w-[280px] bg-surface-elevated text-fg p-8 md:p-10 rounded-md border border-border space-y-8"
          >
            <p className="text-heading-4 md:text-heading-3 font-display text-fg leading-snug">
              &ldquo;{item.quote}&rdquo;
            </p>
            <div className="flex flex-col">
              <span className="text-body-medium text-fg font-display">
                {item.attribution}
              </span>
              {item.role && (
                <span className="text-body-small text-fg-muted">
                  {item.role}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
