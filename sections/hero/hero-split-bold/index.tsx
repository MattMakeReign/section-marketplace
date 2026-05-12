import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type Cta = { label: string; href: string };

export type HeroSplitBoldProps = {
  position?: number;
  headline?: string;
  supporting?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
};

const DEFAULT_PRIMARY: Cta = { label: "Primary", href: "#" };
const DEFAULT_SECONDARY: Cta = { label: "Secondary", href: "#" };

export function HeroSplitBold({
  position,
  headline = "A bold hero, split clean down the middle.",
  supporting = "Drop a line of supporting copy here that explains what this site is and who it's for.",
  primaryCta = DEFAULT_PRIMARY,
  secondaryCta = DEFAULT_SECONDARY,
}: HeroSplitBoldProps) {
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
        <div className="col-span-12 md:col-span-7 space-y-6">
          <p className="text-label-small uppercase text-fg-subtle font-mono">
            Section {String(position ?? 0).padStart(2, "0")} · {manifest.id}
          </p>
          <h1 className="text-heading-2 md:text-heading-1 text-fg font-display">
            {headline}
          </h1>
        </div>
        <div className="col-span-12 md:col-span-5 space-y-6 md:self-end">
          <p className="text-body-large text-fg-muted">{supporting}</p>
          <div className="flex gap-3">
            <a
              href={primaryCta.href}
              className="bg-accent text-accent-fg hover:bg-accent-hover h-10 px-4 rounded-sm text-button-large uppercase font-mono transition-colors duration-fast ease-standard inline-flex items-center"
            >
              {primaryCta.label}
            </a>
            <a
              href={secondaryCta.href}
              className="bg-surface text-fg border border-border hover:border-border-strong h-10 px-4 rounded-sm text-button-large uppercase font-mono transition-colors duration-fast ease-standard inline-flex items-center"
            >
              {secondaryCta.label}
            </a>
          </div>
        </div>
      </SectionGrid>
    </Section>
  );
}
