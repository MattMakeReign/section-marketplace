import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export function HeroSplitBold({ position }: { position?: number }) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-lg"
    >
      <SectionGrid>
        <div className="col-span-12 md:col-span-7 space-y-6">
          <p className="text-label-small uppercase text-fg-subtle font-mono">
            Section {String(position ?? 0).padStart(2, "0")} · {manifest.id}
          </p>
          <h1 className="text-heading-2 md:text-heading-1 text-fg font-display">
            A bold hero, split clean down the middle.
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 space-y-6 md:self-end">
          <p className="text-body-large text-fg-muted">
            {manifest.summary}
          </p>
          <div className="flex gap-3">
            <a
              href="#"
              className="bg-accent text-accent-fg hover:bg-accent-hover h-10 px-4 rounded-sm text-button-large uppercase font-mono transition-colors duration-fast ease-standard inline-flex items-center"
            >
              Primary
            </a>
            <a
              href="#"
              className="bg-surface text-fg border border-border hover:border-border-strong h-10 px-4 rounded-sm text-button-large uppercase font-mono transition-colors duration-fast ease-standard inline-flex items-center"
            >
              Secondary
            </a>
          </div>
        </div>
      </SectionGrid>
    </Section>
  );
}
