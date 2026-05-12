import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type Testimonial = {
  quote: string;
  attribution: string;
  role?: string;
};

export type TestimonialsGridProps = {
  position?: number;
  eyebrow?: string;
  heading?: string;
  items?: Testimonial[];
};

const DEFAULT_ITEMS: Testimonial[] = [
  {
    quote:
      "The clearest brief-to-launch process we've ever been through. They cut through what didn't matter and built around what did.",
    attribution: "Lila Okafor",
    role: "Director of Brand, Penn & Vine",
  },
  {
    quote:
      "Our site finally tells the story we tell in pitches. Conversions on contact forms doubled inside the first month.",
    attribution: "Alex Brennan",
    role: "Founder, Slowburn",
  },
  {
    quote:
      "They held the line on craft when we wanted to compromise. We're glad they did.",
    attribution: "Saskia Wright",
    role: "CMO, Northwind Studio",
  },
];

export function TestimonialsGrid({
  position,
  eyebrow = "Clients",
  heading = "What people we work with say.",
  items = DEFAULT_ITEMS,
}: TestimonialsGridProps) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg bg-surface text-fg"
    >
      <SectionGrid>
        <div className="col-span-12 mb-12 md:mb-16 space-y-3">
          <p className="text-label-small uppercase text-fg-subtle font-mono">
            Section {String(position ?? 0).padStart(2, "0")} · {eyebrow}
          </p>
          <h2 className="text-heading-3 md:text-heading-2 text-fg font-display max-w-prose">
            {heading}
          </h2>
        </div>

        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 auto-rows-fr">
          {items.map((item, idx) => (
            <article
              key={idx}
              className="bg-surface-elevated text-fg p-8 rounded-md border border-border flex flex-col gap-8"
            >
              <p className="text-body-large text-fg flex-1 leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="flex flex-col pt-6 border-t border-border">
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
      </SectionGrid>
    </Section>
  );
}
