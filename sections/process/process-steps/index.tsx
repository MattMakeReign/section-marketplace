import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export type ProcessStep = {
  label: string;
  description: string;
};

export type ProcessStepsProps = {
  position?: number;
  eyebrow?: string;
  heading?: string;
  steps?: ProcessStep[];
};

const DEFAULT_STEPS: ProcessStep[] = [
  {
    label: "Listen",
    description:
      "We start by reading everything you've got and asking the questions you've been avoiding. The brief gets sharper before any pixel moves.",
  },
  {
    label: "Frame",
    description:
      "Strategy, structure, scope. We agree what we're making and why before we agree what it looks like.",
  },
  {
    label: "Make",
    description:
      "Design and build run together. Short cycles, real artefacts, no theatre. You see actual things, not slide decks.",
  },
  {
    label: "Hand over",
    description:
      "We document, train, and stay close for the first months in the wild. The work has to keep working after we leave the room.",
  },
];

export function ProcessSteps({
  position,
  eyebrow = "Process",
  heading,
  steps = DEFAULT_STEPS,
}: ProcessStepsProps) {
  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-xl bg-surface-muted text-fg"
    >
      <SectionGrid>
        <div className="col-span-12 md:col-span-8 space-y-4">
          <p className="text-label-small uppercase text-fg-subtle font-mono">
            Section {String(position ?? 0).padStart(2, "0")} · {eyebrow}
          </p>
          {heading ? (
            <h2 className="text-heading-2 text-fg font-display">{heading}</h2>
          ) : null}
        </div>

        <ol className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          {steps.map((step, i) => (
            <li
              key={i}
              className="space-y-3 border-t border-border pt-6"
            >
              <span className="block text-label-small text-fg-subtle font-mono uppercase">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-heading-4 text-fg font-display">
                {step.label}
              </h3>
              <p className="text-body-medium text-fg-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </SectionGrid>
    </Section>
  );
}
