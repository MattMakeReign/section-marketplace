"use client";

import * as React from "react";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

type FaqItem = { question: string; answer: string };

export type FaqSplitCtaProps = {
  position?: number;
  eyebrow?: string;
  heading?: string;
  body?: string;
  cta?: { label: string; href: string };
  items?: FaqItem[];
};

const DEFAULT_ITEMS: FaqItem[] = [
  {
    question: "How long does a project usually run?",
    answer:
      "Most engagements are six to twelve weeks, end-to-end. Strategy in the first two, design in the middle, build and launch at the close. We'll give you a clear week-by-week plan in the proposal — no surprises mid-flight.",
  },
  {
    question: "Do you take on small engagements?",
    answer:
      "Occasionally, if the scope is unusually well-defined and the work meaningfully advances something we'd be proud to show. Most of what we do is multi-week, multi-discipline — that's where we add the most.",
  },
  {
    question: "What does pricing look like?",
    answer:
      "Fixed-fee for defined scopes, retainers for ongoing partnerships. Site projects sit in a £25–£90k range depending on depth. We'll quote against your brief; nothing is hourly.",
  },
  {
    question: "Can you work with our existing brand?",
    answer:
      "Always. Most of our clients arrive with a brand they want to honour, not rebuild. We'll adapt the system, sharpen the editorial layer, and leave the marks alone unless we agree otherwise.",
  },
  {
    question: "Where are you based?",
    answer:
      "Charlotte Road, EC2A — central London. We work with clients in Europe and the US; most of the relationship runs over video. Workshops and kickoffs happen in person where we can.",
  },
  {
    question: "Do you work with in-house teams?",
    answer:
      "Yes — about half our engagements run alongside an internal design or product team. We're comfortable in a supporting role on a long arc, not just the headline-and-out model.",
  },
];

export function FaqSplitCta({
  position,
  eyebrow = "Questions",
  heading = "Things we get asked.",
  body = "A short answer to the six we hear most often. If yours isn't here, write us — we'll send back something honest.",
  cta = { label: "Get in touch", href: "/contact" },
  items = DEFAULT_ITEMS,
}: FaqSplitCtaProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className="py-section-xl bg-surface text-fg"
    >
      <SectionGrid>
        {/* Left — heading + body + CTA */}
        <div className="col-span-12 min-[48rem]:col-span-5 flex flex-col gap-6 min-[48rem]:pr-8">
          <p className="text-label-large uppercase text-accent">{eyebrow}</p>
          <h2 className="text-heading-2 font-display max-w-[18ch] m-0">
            {heading}
          </h2>
          <p className="text-body-large max-w-[36ch] m-0">{body}</p>
          <div className="pt-2">
            <a href={cta.href} className="btn btn-primary btn-large">
              {cta.label}
            </a>
          </div>
        </div>

        {/* Right — accordion */}
        <div className="col-span-12 min-[48rem]:col-span-7 flex flex-col gap-3">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            const toggle = () => setOpenIndex(isOpen ? null : i);
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }}
                className="
                  bg-surface-elevated
                  border border-border/60
                  rounded-md
                  px-6 py-5 min-[48rem]:px-8 min-[48rem]:py-6
                  cursor-pointer
                  transition-colors duration-200
                  hover:border-border
                  focus:outline-none focus-visible:ring-1 focus-visible:ring-accent
                "
              >
                <div className="flex items-start justify-between gap-6">
                  <span className="text-body-large font-display leading-snug">
                    {item.question}
                  </span>
                  <PlusIcon open={isOpen} />
                </div>
                {isOpen && (
                  <p className="text-body-medium text-fg-muted pt-4 pr-8 m-0">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SectionGrid>
    </Section>
  );
}

/* ── Plus / × icon ───────────────────────────────────────────────── */

function PlusIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className="
        relative shrink-0
        w-9 h-9 grid place-items-center
        text-fg
      "
    >
      <span className="absolute block w-4 h-px bg-current" />
      <span
        className="
          absolute block w-4 h-px bg-current
          transition-transform duration-300 ease-out
        "
        style={{ transform: open ? "rotate(0deg)" : "rotate(90deg)" }}
      />
    </span>
  );
}

export default FaqSplitCta;
