import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export function CtaBand({ position }: { position?: number }) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="bg-surface-inverse text-fg-inverse"
    >
      <SectionGrid>
        <div className="col-span-12 py-section-md flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="space-y-3">
            <p className="text-label-small uppercase font-mono opacity-60">
              Section {String(position ?? 0).padStart(2, "0")} · {manifest.id}
            </p>
            <h2 className="text-heading-3 md:text-heading-2 font-display">
              Ready when you are.
            </h2>
          </div>
          <a
            href="#"
            className="bg-accent text-accent-fg hover:bg-accent-hover h-11 px-6 rounded-sm text-button-large uppercase font-mono transition-colors duration-fast ease-standard inline-flex items-center self-start md:self-auto"
          >
            Get started
          </a>
        </div>
      </SectionGrid>
    </Section>
  );
}
