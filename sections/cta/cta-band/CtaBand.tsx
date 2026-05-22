"use client";

import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import manifest from "./section.json";

export type CtaBandProps = {
  position?: number;
  background?: "dark" | "light" | "accent";
  /** Outer vertical padding scale. */
  paddingScale?: "sm" | "md" | "lg" | "xl";
  /** Headline alignment within its column. */
  headlineAlign?: "left" | "center" | "right";
  /** Stack vertically instead of side-by-side at desktop. */
  stackOnDesktop?: boolean;
  /** Horizontal gap between text and CTA (px). */
  gapPx?: number;
  /** CTA pill style. */
  ctaVariant?: "accent" | "outline" | "ghost";
  /** CTA size. */
  ctaSize?: "sm" | "md" | "lg";
};

export function CtaBand({
  position,
  background = "dark",
  paddingScale = "md",
  headlineAlign = "left",
  stackOnDesktop = false,
  gapPx = 32,
  ctaVariant = "accent",
  ctaSize = "md",
}: CtaBandProps = {}) {
  const padding =
    paddingScale === "sm" ? "py-section-sm"
    : paddingScale === "lg" ? "py-section-lg"
    : paddingScale === "xl" ? "py-section-xl"
    : "py-section-md";

  const bgClass =
    background === "light" ? "bg-surface text-fg"
    : background === "accent" ? "bg-accent text-accent-fg"
    : "bg-surface-inverse text-fg-inverse";

  const alignWrap =
    headlineAlign === "center" ? "items-center text-center"
    : headlineAlign === "right" ? "items-end text-right"
    : "items-start text-left";

  const ctaSizing =
    ctaSize === "sm" ? "h-9 px-4 text-button-small"
    : ctaSize === "lg" ? "h-12 px-7 text-button-large"
    : "h-11 px-6 text-button-large";

  const ctaSurface =
    ctaVariant === "outline" ? "bg-transparent border border-current"
    : ctaVariant === "ghost" ? "bg-transparent hover:bg-fg/10"
    : "bg-accent text-accent-fg hover:bg-accent-hover";

  return (
    <Section
      slug={manifest.id}
      title={manifest.title}
      category={manifest.category}
      version={manifest.version}
      position={position}
      className={bgClass}
    >
      <SectionGrid>
        <div
          className={`col-span-12 ${padding} flex flex-col ${stackOnDesktop ? "md:flex-col" : "md:flex-row md:items-center md:justify-between"}`}
          style={{ gap: gapPx }}
        >
          <div className={`flex flex-col gap-3 ${alignWrap}`}>
            <p className="text-label-small uppercase font-mono opacity-60 m-0">
              Section {String(position ?? 0).padStart(2, "0")} · {manifest.id}
            </p>
            <h2 className="text-heading-3 md:text-heading-2 font-display m-0">
              Ready when you are.
            </h2>
          </div>
          <a
            href="#"
            className={`${ctaSizing} ${ctaSurface} rounded-sm uppercase font-mono transition-colors duration-fast ease-standard inline-flex items-center self-start md:self-auto`}
          >
            Get started
          </a>
        </div>
      </SectionGrid>
    </Section>
  );
}
