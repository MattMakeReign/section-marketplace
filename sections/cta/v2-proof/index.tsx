import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export function V2Proof({ position }: { position?: number }) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version="0.0.1"
      position={position}
      className="bg-fg text-fg-inverse"
    >
      <SectionGrid>
        <div className="col-span-12 py-section-md text-center space-y-4">
          <p className="text-label-small uppercase font-mono opacity-50">API-mode submission</p>
          <h2 className="text-heading-2 font-display">No marketplace clone needed</h2>
          <p className="opacity-70">This section reached the live library via POST, not git push.</p>
        </div>
      </SectionGrid>
    </Section>
  );
}
