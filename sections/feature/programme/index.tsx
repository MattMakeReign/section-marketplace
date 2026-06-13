"use client";

/**
 * Programme — the five key areas of Builders Table, as a sticky-rail
 * feature showcase.
 *
 * Layout (12-col SectionGrid, fluid — matches the reference composition):
 *   - HEADER ROW: micro-label eyebrow in the rail column, statement heading
 *     (THE heading pattern — closing line in Meso) in the content columns.
 *   - LEFT RAIL (cols 1–3, sticky from lg): mono uppercase tab list of the
 *     five areas. Clicking a tab scrolls to its item (Lenis-aware); a
 *     scroll-spy keeps the active tab honest.
 *   - CONTENT (cols 4–12): five stacked items. Each item is a nested
 *     9-track grid whose tracks land exactly on the page grid (equal
 *     gutters → equal math): IMAGE on global cols 5–8 (four columns,
 *     centre — placeholder until real assets land), text block (numbered
 *     micro-label, heading, body) on global cols 10–12 (final three).
 *
 * Motion: useReveal entrance per element; GSAP ScrollTrigger parallax on
 * the images (desktop + no-reduced-motion only, per the project's
 * matchMedia convention).
 *
 * Copy is CMS-owned (programmeContent): eyebrow, heading (lines), items.
 * Item numbers are derived from order — editors never maintain numbering.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sharedElementNavigate } from "@/components/page-transition";
import { Button } from "@/components/button";
import {
  destroyHighlightMarkerTextReveal,
  initHighlightMarkerTextReveal,
} from "@/components/highlight-marker-reveal";
import { Section } from "@/components/section";
import { SectionGrid } from "@/components/section-grid";
import { DisplayHeading } from "@/components/display-heading";
import { useReveal } from "@mr/canonical-stack";
import { getSmoothScroll } from "@/design-system/smooth-scroll";
import sample from "./sample.json";

gsap.registerPlugin(ScrollTrigger);

type ProgrammeItem = {
  _key?: string;
  label: string;
  heading: string;
  body: string;
  /** Sanity-provided image; falls back to a stable placeholder. */
  imageSrc?: string | null;
  imageAlt?: string | null;
  /** Optional detail-page route — the image becomes a link and gets the
   *  shared-element page transition (the square becomes that page's
   *  header). */
  href?: string | null;
  /** Blocked-out lockup centred over the image (newline = line break;
   *  each line gets its own ground-colour box, last line in Meso). Stays
   *  put while the image parallaxes behind it. */
  imageTitle?: string | null;
};

export type ProgrammeProps = {
  /** Mono micro-label above the rail heading. */
  eyebrow?: string;
  /** Statement heading; newlines = authored line breaks (last line Meso). */
  heading?: string;
  /** The five areas, in programme order. Numbers derive from position. */
  items?: ProgrammeItem[];
  /** Item image height in vh. */
  imageHeightVh?: number;
  /** Parallax travel on item images, px (0 = off). */
  parallaxPx?: number;
  /** Entrance stagger between revealed elements, ms. */
  revealStaggerMs?: number;
  /** Injected by <SectionsContainer>. */
  position?: number;
};

// sample.json is the section's own baseline — every render path converges
// on these defaults.
const D = sample.props as Required<Omit<ProgrammeProps, "position">>;

const placeholderFor = (index: number) =>
  `https://picsum.photos/seed/bt-programme-${index + 1}/1600/1000`;

// Resolve an item's background image. Sanity returns a COMPLETE items
// array, so when its image field is empty (imageSrc null) it shadows the
// sample.json default for the whole item. Fall back to the section's own
// baseline image (matched by label, then index) so the local asset shows
// until a real image is uploaded in Studio — then the CMS value wins.
const SAMPLE_ITEMS = sample.props.items as ProgrammeItem[];
const resolveImage = (item: ProgrammeItem, index: number): string =>
  item.imageSrc ||
  SAMPLE_ITEMS.find((s) => s.label === item.label)?.imageSrc ||
  SAMPLE_ITEMS[index]?.imageSrc ||
  placeholderFor(index);

/** The lockup renders twice, perfectly stacked: the boxes layer paints
 *  the rectangles (transparent text), the text layer paints the words
 *  above BOTH boxes. */
const LOCKUP_LAYERS = ["boxes", "text"] as const;

/** GSAP hover for linked images — fast attack, long settle (expo.out),
 *  instead of a flat CSS transition. Tweens the dedicated hover layer so
 *  the scale multiplies with the img's parallax transform. */
function hoverScale(layer: Element | null, on: boolean): void {
  if (!layer) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.killTweensOf(layer);
  gsap.to(layer, {
    scale: on ? 1.05 : 1,
    duration: on ? 1.2 : 0.9,
    ease: on ? "expo.out" : "power3.out",
  });
}

export function Programme({
  eyebrow = D.eyebrow,
  heading = D.heading,
  items = D.items as ProgrammeItem[],
  imageHeightVh = D.imageHeightVh,
  parallaxPx = D.parallaxPx,
  revealStaggerMs = D.revealStaggerMs,
  position,
}: ProgrammeProps) {
  const router = useRouter();
  const revealRef = useReveal<HTMLDivElement>({
    selector: "[data-mr-reveal]",
    stagger: revealStaggerMs,
  });
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Scroll-spy — the item crossing the upper-middle band of the viewport
  // owns the rail highlight.
  useEffect(() => {
    const els = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveIndex(els.indexOf(entry.target as HTMLElement));
          }
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  // Image parallax — scrubbed ScrollTrigger, desktop + motion-ok only.
  // Each image over-scales just enough to cover its own travel.
  useEffect(() => {
    const root = revealRef.current;
    if (!root || parallaxPx <= 0) return;
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
      () => {
        root
          .querySelectorAll<HTMLElement>("[data-programme-parallax]")
          .forEach((img) => {
            const host = img.parentElement;
            if (!host) return;
            const scale = 1 + (2 * parallaxPx) / Math.max(host.offsetHeight, 1);
            gsap.fromTo(
              img,
              { y: -parallaxPx, scale },
              {
                y: parallaxPx,
                scale,
                ease: "none",
                scrollTrigger: {
                  trigger: host,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });
      },
    );
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parallaxPx, imageHeightVh, items]);

  // Osmo highlight-marker reveal on the statement heading — the same
  // swipe-mask as the hero title and footer CTA. Owns the heading's
  // entrance (so the heading does NOT carry data-mr-reveal); init waits
  // for fonts so bar geometry matches final metrics.
  useEffect(() => {
    const rootEl = revealRef.current ?? document;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) initHighlightMarkerTextReveal(rootEl);
    });
    return () => {
      cancelled = true;
      destroyHighlightMarkerTextReveal(rootEl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heading, revealStaggerMs]);

  const scrollToItem = (index: number) => {
    const el = itemRefs.current[index];
    if (!el) return;
    const lenis = getSmoothScroll();
    if (lenis) lenis.scrollTo(el, { offset: -96 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Section
      slug="programme"
      title="Programme"
      category="feature"
      position={position}
      className="relative bg-surface"
    >
      <SectionGrid ref={revealRef} className="py-section-lg">
        {/* ── Header row: eyebrow in the rail column, heading beside ── */}
        <div className="col-span-12 lg:col-span-3">
          <p data-mr-reveal className="micro-label">
            <span className="micro-label-marker" aria-hidden />
            {eyebrow}
          </p>
        </div>
        <div className="col-span-12 mt-6 lg:col-span-7 lg:col-start-4 lg:mt-0">
          <DisplayHeading
            as="h2"
            text={heading}
            size="text-heading-2"
            attrs={{
              "data-highlight-marker-reveal": "",
              "data-marker-direction": "right",
              "data-marker-theme": "--marker-bar",
              "data-marker-stagger": revealStaggerMs,
            }}
            className="text-fg"
          />
        </div>

        {/* ── Left rail — tab list, sticky from lg ───────────────── */}
        <div className="col-span-12 mt-16 lg:col-span-3 lg:mt-24 lg:sticky lg:top-24 lg:self-start">
          <nav
            data-mr-reveal
            aria-label="Programme areas"
            className="flex flex-col border-t border-border"
          >
            {items.map((item, i) => (
              <button
                key={item._key ?? i}
                type="button"
                onClick={() => scrollToItem(i)}
                aria-current={activeIndex === i ? "true" : undefined}
                className={`flex items-start gap-3 border-b border-border py-4 text-left font-mono text-label-large uppercase tracking-label transition-colors ${
                  activeIndex === i
                    ? "text-fg"
                    : "text-fg-subtle hover:text-fg-muted"
                }`}
                style={{ transitionDuration: "var(--duration-fast)" }}
              >
                <span aria-hidden className="text-fg-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Mono is ALWAYS uppercase (DS rule) — casing comes from
                    CSS, labels stay lowercase in content. One line per
                    label (user call 2026-06-12) — newlines flatten. */}
                <span className="whitespace-nowrap">
                  {item.label.replace(/\n/g, " ").trim()}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* ── Content — image in the middle, text to its right ───── */}
        <div className="col-span-12 mt-16 flex flex-col gap-24 lg:col-span-9 lg:col-start-4 lg:mt-24 lg:gap-32">
          {items.map((item, i) => (
            <article
              key={item._key ?? i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="flex flex-col gap-8 lg:grid lg:grid-cols-9 lg:items-start lg:gap-[var(--grid-gutter)]"
              style={{ scrollMarginTop: "6rem" }}
            >
              {/* Image — four columns, centre of the page grid (global
                  cols 5–8). Placeholder until real assets land. Linked
                  items scale gently on hover (rollover-only motion) and
                  hand off to the shared-element page transition. */}
              <div
                data-mr-reveal
                data-programme-image
                className="relative overflow-hidden rounded-lg bg-surface-elevated lg:col-start-2 lg:col-span-4"
                style={{
                  height: `${imageHeightVh}vh`,
                  // Query container so the lockup type scales with the
                  // card (cqw units) instead of wrapping on narrow grids.
                  containerType: "inline-size",
                }}
              >
                {item.href ? (
                  <a
                    href={item.href}
                    aria-label={`${item.label.replace(/\n/g, " ")} — open page`}
                    className="absolute inset-0 block"
                    onMouseEnter={(e) => {
                      router.prefetch(item.href!);
                      hoverScale(e.currentTarget.firstElementChild, true);
                    }}
                    onMouseLeave={(e) =>
                      hoverScale(e.currentTarget.firstElementChild, false)
                    }
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                        return;
                      e.preventDefault();
                      sharedElementNavigate(
                        item.href!,
                        router,
                        e.currentTarget.parentElement as HTMLElement,
                      );
                    }}
                  >
                    {/* Hover layer — its scale multiplies with the img's
                        parallax transform, so the two never fight. */}
                    <div className="absolute inset-0 will-change-transform">
                      <img
                        data-programme-parallax
                        src={resolveImage(item, i)}
                        alt={item.imageAlt || item.label}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover will-change-transform"
                      />
                    </div>
                  </a>
                ) : (
                  <img
                    data-programme-parallax
                    src={resolveImage(item, i)}
                    alt={item.imageAlt || item.label}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  />
                )}
                {/* Blocked-out lockup — sits ABOVE the parallax + hover
                    layers and outside them, so it stays put while the
                    image moves behind. pointer-events-none keeps the
                    link beneath clickable. */}
                {item.imageTitle ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4"
                  >
                    {/* Two stacked copies: boxes layer below, text layer
                        above — the text is one element over BOTH boxes,
                        so box overlap can never clip a line. Font caps at
                        heading-3 and shrinks with the card (cqw) so the
                        longest line always fits on ONE line. */}
                    <div className="relative">
                      {LOCKUP_LAYERS.map((layer) => (
                        <DisplayHeading
                          key={layer}
                          as="div"
                          text={item.imageTitle!}
                          size=""
                          className={`display-heading-blocked display-heading-blocked--${layer}`}
                          style={{
                            fontSize: "min(var(--text-heading-3), 8.2cqw)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Text — the final three columns (global cols 10–12). Item
                  titles run lowercase/natural casing at heading-4 (user
                  call 2026-06-12) — deliberately NOT the uppercase
                  DisplayHeading pattern. */}
              <div className="flex flex-col lg:col-start-7 lg:col-span-3 lg:pt-2">
                <p data-mr-reveal className="micro-label">
                  <span className="micro-label-marker" aria-hidden />
                  {String(i + 1).padStart(2, "0")} /{" "}
                  {item.label.replace(/\n/g, " ").trim()}
                </p>
                <h3
                  data-mr-reveal
                  className="mt-5 font-display text-heading-4 text-fg"
                >
                  {item.heading}
                </h3>
                <p
                  data-mr-reveal
                  className="mt-6 text-body-medium text-fg-body"
                >
                  {item.body}
                </p>
                {item.href ? (
                  <div data-mr-reveal className="mt-8">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        const wrap = itemRefs.current[i]?.querySelector<HTMLElement>(
                          "[data-programme-image]",
                        );
                        if (wrap)
                          sharedElementNavigate(item.href!, router, wrap);
                        else router.push(item.href!);
                      }}
                    >
                      Find out more
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </SectionGrid>
    </Section>
  );
}

export default Programme;
