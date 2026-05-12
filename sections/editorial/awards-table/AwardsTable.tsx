"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

const ROWS = [
  { project: "Grateful for diversity", award: "Awwwards SOTD", year: "2023" },
  { project: "Lost in dance", award: "Awwwards SOTD", year: "2022" },
  { project: "Lost in dance", award: "CSS Design Awards", year: "2022" },
  { project: "Lost in dance", award: "Webflow Showcase", year: "2022" },
  { project: "Zwee", award: "Awwwards SOTM", year: "2021" },
  { project: "Kaili Swimwear Website", award: "Awwwards Developer Award", year: "2020" },
];

/**
 * Scroll-reveal hook — flips `visible` true the first time the element enters
 * the viewport, then disconnects. No GSAP / Framer needed for this much.
 */
function useReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function AwardsTable({ position }: { position?: number }) {
  const heading = useReveal<HTMLDivElement>();
  const table = useReveal<HTMLDivElement>();

  return (
    <Section
      slug={manifest.id}
      title={manifest.name}
      category={manifest.category}
      position={position}
      className="bg-surface-muted text-fg py-section-lg"
    >
      <SectionGrid>
        <div
          ref={heading.ref}
          className={`col-span-12 flex flex-col items-center text-center gap-4 transition-all duration-slow ease-standard ${
            heading.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-label-small uppercase text-fg-subtle font-mono">
            Section {String(position ?? 0).padStart(2, "0")} · {manifest.id}
          </p>
          <h2 className="text-heading-2 md:text-heading-1 font-display text-balance">
            Awarded for a reason
          </h2>
          <p className="text-body-large text-fg-muted max-w-prose">
            {manifest.summary}
          </p>
        </div>

        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-3 lg:col-span-8 mt-12">
          <div
            ref={table.ref}
            className={`transition-all duration-slow ease-standard ${
              table.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: table.visible ? "150ms" : "0ms" }}
          >
            <div role="table" className="grid grid-cols-[1fr_1fr_auto]">
              <div role="rowheader" className="flex items-center h-[60px] border-b-2 border-fg text-label-small uppercase font-mono tracking-[0.06em]">
                Project
              </div>
              <div role="rowheader" className="flex items-center h-[60px] border-b-2 border-fg text-label-small uppercase font-mono tracking-[0.06em]">
                Award
              </div>
              <div role="rowheader" className="flex items-center justify-end h-[60px] border-b-2 border-fg text-label-small uppercase font-mono tracking-[0.06em]">
                Year
              </div>

              {ROWS.map((row, i) => (
                <Fragment key={`${row.project}-${row.award}-${i}`}>
                  <div role="cell" className="flex items-center h-[70px] border-b border-border text-body-medium">
                    {row.project}
                  </div>
                  <div role="cell" className="flex items-center h-[70px] border-b border-border text-body-medium text-fg-muted">
                    {row.award}
                  </div>
                  <div role="cell" className="flex items-center justify-end h-[70px] border-b border-border text-body-medium font-mono tabular-nums">
                    {row.year}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </SectionGrid>
    </Section>
  );
}
