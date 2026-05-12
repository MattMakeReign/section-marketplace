import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export function BannerAcme({ position }: { position?: number }) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version="0.0.1"
      position={position}
      className="bg-accent text-accent-fg"
    >
      <SectionGrid>
        <div className="col-span-12 py-section-md text-center">
          <h2 className="text-heading-2 font-display">Remote jump shipped, end-to-end</h2>
          <p className="mt-4 text-body-medium opacity-80">
            This section was authored in mr-acme-test, submitted via mr submit,
            and now lives in the live marketplace on Vercel.
          </p>
        </div>
      </SectionGrid>
    </Section>
  );
}
