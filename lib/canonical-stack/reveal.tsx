/**
 * useReveal — the canonical scroll-in entrance hook for marketplace sections.
 *
 * Why this exists:
 *   GSAP + ScrollTrigger entrance animations need a global MotionProvider,
 *   Lenis ticking, and survive React's strict-mode double-mount + Fast Refresh.
 *   When ANY of those go wrong (Lenis paused, no provider, hidden tab) the
 *   `gsap.set(opacity: 0)` start state strands the section invisible.
 *
 *   This hook replaces that pipeline with:
 *     - native `IntersectionObserver` (no Lenis dependency)
 *     - SSR-safe hidden state via `data-mr-reveal` (set in JSX, not JS)
 *     - CSS-driven transition (no JS framerate)
 *     - revealed state via `data-mr-revealed="true"` (added by the hook on IO fire)
 *     - stagger via CSS calc on `--mr-reveal-index` × `--mr-reveal-stagger`
 *
 *   Zero runtime dependencies beyond React + the CSS rules in
 *   `@mr/canonical-stack/styles.css`. Works in any host context that loads
 *   that stylesheet — including the marketplace render iframe.
 *
 * Contract:
 *   - You put `data-mr-reveal` on every element that should animate in.
 *   - You attach the ref returned by `useReveal()` to the TRIGGER element
 *     (the one whose viewport entry decides when reveal happens). For a
 *     single-element reveal, the trigger IS the animated element. For a
 *     staggered group, the trigger is the parent and the children carry
 *     `data-mr-reveal` themselves.
 *   - On viewport entry (default: 15% visible, 80px above bottom), the hook
 *     adds `data-mr-revealed="true"` to:
 *       - the ref'd element itself (if no `selector` option), OR
 *       - all elements matching `selector` inside the ref'd element.
 *
 * Reduced motion:
 *   Honoured automatically by the CSS rule in styles.css — transition
 *   collapses to a 220ms opacity fade with no translate / blur.
 */

"use client";

import { useEffect, useRef } from "react";

export type RevealOptions = {
  /**
   * CSS selector for staggered children inside the ref'd container. When
   * provided, each matching child gets `data-mr-revealed="true"` added on
   * viewport entry, in DOM order, with a per-child delay driven by the
   * `--mr-reveal-stagger` × `--mr-reveal-index` CSS calc.
   *
   * When omitted, the hook reveals the ref'd element itself (single-target).
   */
  selector?: string;
  /**
   * Milliseconds between each staggered child's reveal. Only meaningful when
   * `selector` is provided. Default 90ms.
   */
  stagger?: number;
  /** IntersectionObserver threshold. Default 0.15. */
  threshold?: number;
  /**
   * IntersectionObserver rootMargin. Default `"0px 0px -80px 0px"` so the
   * reveal fires when the trigger is 80px into the viewport — gives a
   * little anticipation without feeling delayed.
   */
  rootMargin?: string;
  /**
   * Reveal once and stop observing. Default true. Set false for elements
   * that should re-hide when scrolled out and re-reveal on re-entry.
   */
  once?: boolean;
};

/**
 * @example single-element reveal
 *   const ref = useReveal();
 *   return <h2 ref={ref} data-mr-reveal>Headline</h2>;
 *
 * @example staggered children
 *   const ref = useReveal({ selector: "[data-mr-reveal]", stagger: 120 });
 *   return (
 *     <div ref={ref}>
 *       {cards.map((c, i) => (
 *         <Card key={c.id} data-mr-reveal />
 *       ))}
 *     </div>
 *   );
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options: RevealOptions = {},
) {
  const ref = useRef<T>(null);
  const {
    selector,
    stagger = 90,
    threshold = 0.15,
    rootMargin = "0px 0px -80px 0px",
    once = true,
  } = options;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets: HTMLElement[] = selector
      ? Array.from(root.querySelectorAll<HTMLElement>(selector))
      : [root];

    if (targets.length === 0) return;

    // Wire the stagger CSS variables. `--mr-reveal-stagger` lives on the
    // parent; `--mr-reveal-index` on each child. CSS reads both via calc().
    if (selector) {
      root.style.setProperty("--mr-reveal-stagger", `${stagger}ms`);
      targets.forEach((el, i) => {
        el.style.setProperty("--mr-reveal-index", String(i));
      });
    }

    const reveal = () => {
      targets.forEach((el) => el.setAttribute("data-mr-revealed", "true"));
    };
    const unreveal = () => {
      targets.forEach((el) => el.removeAttribute("data-mr-revealed"));
    };

    // No-IO fallback (SSR-rendered then hydrated in an environment without
    // IntersectionObserver). Reveal immediately so the section isn't stuck
    // invisible. Vanishingly rare in modern browsers but a safety net for
    // the marketplace render iframe or any prerender context.
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    // Trigger element: when a `selector` is provided, observe the FIRST
    // matching element (the row of items themselves) so the reveal fires
    // as the row enters the viewport — not as the larger container does.
    // For single-target reveals (no selector), the ref'd element IS the
    // trigger.
    const trigger = selector ? targets[0] : root;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          if (once) obs.disconnect();
        } else if (!once) {
          unreveal();
        }
      },
      { threshold, rootMargin },
    );

    obs.observe(trigger);
    return () => obs.disconnect();
  }, [selector, stagger, threshold, rootMargin, once]);

  return ref;
}
