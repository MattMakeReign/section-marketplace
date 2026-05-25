"use client";

/**
 * KineticWordReveal — letters swap to media on hover.
 *
 * Adapted from the madewithgsap.com mwg_093 reference. Layout / interaction
 * only — original CDN refs, hardcoded font import, and stripped of brand
 * vocab. Local design-system semantic colour applies via `--surface` / `--fg`.
 *
 * Interaction:
 *   - Each letter (space chars excluded) is hoverable.
 *   - On mouseenter, an image from a cycling pool replaces the letter visually.
 *     Adjacent letters slide aside (back.out ease) to make room for the wider
 *     image, then settle back when it retracts.
 *   - Image holds `holdSeconds` then auto-removes with a tiny tilt-and-pop on
 *     the parent letter.
 *   - Pool advances round-robin, so each new hover shows the next image.
 *
 * Math:
 *   - `mediaWidthVw` is the inserted image's width as % of viewport.
 *   - For each letter showing media, an overflow = (mediaWidth − letterWidth)/2
 *     records how much each side needs to push outward. The accumulated
 *     overflow on the left of a given letter pushes it right; right-side
 *     overflow pushes it left. Net x = sumLeftOverflow − sumRightOverflow.
 *   - Whole array re-evaluated on every insert/remove → letters animate to
 *     their new offsets together.
 */

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

const SECTION_ID = "kinetic-word-reveal";

export type RevealItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type MediaAspect = "auto" | "portrait" | "square" | "landscape";

export type KineticWordRevealProps = {
  items?: RevealItem[];
  /** Display word — each non-space character becomes a hover hit. */
  word?: string;
  /** Display font-family. Loaded via Google Fonts CSS API at runtime. */
  fontFamily?: string;
  /** Font weight (Inter ships 500 / 800 for this section by default). */
  fontWeight?: number;
  /** Word size as % of viewport width. */
  fontSizeVw?: number;
  /** Inserted-media width as % of viewport width. */
  mediaWidthVw?: number;
  /** Forced aspect ratio for inserted media (cover-fit). "auto" uses each
   *  image's natural aspect so mixed sources will render at different heights. */
  mediaAspect?: MediaAspect;
  /** Inserted-media corner radius as % of viewport width. */
  mediaRadiusVw?: number;
  /** Minimum gap between two adjacent inserted images, as % of viewport
   *  width. Each side of an image reserves half this value as extra push,
   *  so two neighbouring reveals never touch unless this is 0. */
  mediaGapVw?: number;
  /** Section viewport height (vh). */
  heightVh?: number;
  /** Section tone. */
  background?: "dark" | "light";
  /** Duration of letter-shift settle (seconds). */
  pushSeconds?: number;
  /** How long the inserted media stays before retracting (seconds). */
  holdSeconds?: number;
  /** Max random rotation (degrees) on insert / retract pop. 0 = no tilt. */
  tiltDeg?: number;
  /** Initial scale on insert / retract pop. 1 = no pop. */
  popScale?: number;
  /** Letter spacing (kerning) in em. */
  letterSpacingEm?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

// Section defaults live in sample.json — the file the designer saves to via
// the editor's Save button. Importing it here means EVERY render path of
// this section (page mounts, /preview routes, marketplace overlay previews,
// /render/[id] in the marketplace, installs into other projects) gets the
// designer's saved state by default. There's no other source of truth.
import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<KineticWordRevealProps>;

export const DEFAULT_ITEMS: RevealItem[] = D.items;

const FONT_FALLBACK = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

function googleFontHref(family: string, weights: number[]) {
  const wghts = Array.from(new Set(weights)).sort((a, b) => a - b).join(";");
  const fam = family.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${wghts}&display=swap`;
}

export function KineticWordReveal({
  items = D.items,
  word = D.word,
  fontFamily = D.fontFamily,
  fontWeight = D.fontWeight,
  fontSizeVw = D.fontSizeVw,
  mediaWidthVw = D.mediaWidthVw,
  mediaAspect = D.mediaAspect,
  mediaRadiusVw = D.mediaRadiusVw,
  mediaGapVw = D.mediaGapVw,
  heightVh = D.heightVh,
  background = D.background,
  pushSeconds = D.pushSeconds,
  holdSeconds = D.holdSeconds,
  tiltDeg = D.tiltDeg,
  popScale = D.popScale,
  letterSpacingEm = D.letterSpacingEm,
}: KineticWordRevealProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);

  // Live config — handlers read latest from this so prop changes are picked up
  // without re-binding listeners on every render.
  const cfgRef = useRef({
    mediaWidthVw,
    mediaRadiusVw,
    mediaGapVw,
    pushSeconds,
    holdSeconds,
    tiltDeg,
    popScale,
  });
  cfgRef.current = {
    mediaWidthVw,
    mediaRadiusVw,
    mediaGapVw,
    pushSeconds,
    holdSeconds,
    tiltDeg,
    popScale,
  };

  const itemSrcsRef = useRef<string[]>(items.map((it) => it.src));
  itemSrcsRef.current = items.map((it) => it.src);

  // The visible characters become individually hoverable; spaces stay as
  // simple gaps. We render them up-front in JSX so React owns the DOM, but
  // we re-key the whole word block on `word` change so listeners rebind to
  // the fresh letters.
  const chars = useMemo(() => Array.from(word), [word]);

  useEffect(() => {
    const root = rootRef.current;
    const wordEl = wordRef.current;
    if (!root || !wordEl) return;

    const letters = Array.from(wordEl.querySelectorAll<HTMLSpanElement>(".kwr-letter"));
    if (letters.length === 0) return;

    // Per-letter overflow accumulator. Same length as `letters`. Mutated on
    // each hover/retract to drive applyLetterOffsets().
    const overflows: number[] = new Array(letters.length).fill(0);
    let mediaIndex = 0;

    function applyLetterOffsets() {
      const dur = cfgRef.current.pushSeconds;
      let sumLeft = 0;
      const targets = overflows.map((ov, i) => {
        const sumRight = overflows.slice(i + 1).reduce((a, v) => a + v, 0);
        const x = sumLeft - sumRight;
        sumLeft += ov;
        return x;
      });
      gsap.to(letters, {
        x: (i) => targets[i],
        duration: dur,
        ease: "back.out(3)",
        overwrite: "auto",
      });
    }

    function createMedia(letter: HTMLSpanElement) {
      const cfg = cfgRef.current;
      const srcs = itemSrcsRef.current;
      if (srcs.length === 0) return;
      const img = document.createElement("img");
      img.src = srcs[mediaIndex % srcs.length];
      img.className = "kwr-media";
      img.draggable = false;
      letter.appendChild(img);

      gsap.set(img, { yPercent: -50, xPercent: -50 });
      gsap.from(img, {
        rotation: cfg.tiltDeg === 0 ? 0 : (Math.random() - 0.5) * cfg.tiltDeg,
        scale: cfg.popScale,
        duration: 0.3,
        ease: "back.out(2)",
      });

      mediaIndex = (mediaIndex + 1) % srcs.length;

      const index = letters.indexOf(letter);
      if (index === -1) return;

      // Compute overflow against the CURRENT live mediaWidth (in px) so the
      // slider effect feels instant if a designer changes mediaWidthVw while
      // an image is on screen. Each image reserves half of mediaGapVw on
      // EACH side, so two adjacent images sum to a full mediaGapVw between
      // their edges.
      const mediaWidthPx = (cfg.mediaWidthVw / 100) * window.innerWidth;
      const mediaGapPx = (cfg.mediaGapVw / 100) * window.innerWidth;
      const overflowX = Math.max(0, (mediaWidthPx - letter.getBoundingClientRect().width) / 2 + mediaGapPx / 2);
      overflows[index] = Math.max(overflows[index], overflowX);
      applyLetterOffsets();

      gsap.delayedCall(cfg.holdSeconds, () => {
        const parent = img.parentElement as HTMLSpanElement | null;
        if (!parent) return;
        const idx = letters.indexOf(parent);
        if (idx !== -1) overflows[idx] = 0;
        img.remove();
        applyLetterOffsets();
        gsap.from(parent, {
          rotation: cfg.tiltDeg === 0 ? 0 : (Math.random() - 0.5) * cfg.tiltDeg,
          scale: cfg.popScale,
          duration: 0.3,
          ease: "back.out(2)",
        });
      });
    }

    function onEnter(this: HTMLSpanElement) {
      // Don't double-stack media on the same letter — wait for current to
      // retract first.
      if (this.querySelector(".kwr-media")) return;
      createMedia(this);
    }

    letters.forEach((l) => l.addEventListener("mouseenter", onEnter));

    return () => {
      letters.forEach((l) => l.removeEventListener("mouseenter", onEnter));
      // Kill any pending delayedCalls + tweens scoped to these letters.
      gsap.killTweensOf(letters);
      letters.forEach((l) => {
        const m = l.querySelector(".kwr-media");
        if (m) m.remove();
      });
    };
  }, [word, items.length]);

  // Section style: viewport height, tone, font-family stack (Google Font with
  // local fallback), and CSS vars driving the per-letter sizing.
  const fontStack = `'${fontFamily}', ${FONT_FALLBACK}`;
  const sectionStyle: React.CSSProperties = {
    height: `${heightVh}vh`,
    background:
      background === "dark"
        ? "var(--surface, #121212)"
        : "var(--surface-inverse, #fdfcfc)",
    color:
      background === "dark"
        ? "var(--fg, #f5f5f5)"
        : "var(--fg-inverse, #0a0908)",
    fontFamily: fontStack,
    fontWeight,
    ["--kwr-font-size-vw" as string]: `${fontSizeVw}vw`,
    ["--kwr-media-width-vw" as string]: `${mediaWidthVw}vw`,
    ["--kwr-media-radius-vw" as string]: `${mediaRadiusVw}vw`,
    // Aspect drives the height. "auto" defers to the image's natural ratio
    // (mixed source aspects → uneven visual weight). Forced ratios cover-fit.
    ["--kwr-media-aspect" as string]:
      mediaAspect === "portrait" ? "4 / 5"
      : mediaAspect === "square" ? "1 / 1"
      : mediaAspect === "landscape" ? "4 / 3"
      : "auto",
    ["--kwr-media-object-fit" as string]: mediaAspect === "auto" ? "fill" : "cover",
  } as React.CSSProperties;

  const fontHref = googleFontHref(fontFamily, [fontWeight, 500]);

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="kwr-root relative w-full overflow-hidden grid place-items-center select-none"
      style={sectionStyle}
    >
      {/* Section-local font load. display=swap means content shows in the
       *  fallback first, then re-renders in the target family. */}
      <link rel="stylesheet" href={fontHref} />

      <p
        ref={wordRef}
        // Re-key on word so React rebuilds the letter set; the effect's
        // listeners get cleaned + re-bound naturally.
        key={word}
        className="kwr-word relative inline-flex"
        // letter-spacing in em resolves against THIS element's font-size, so
        // -0.05em of a 110px word = ~-5.5px gap. Setting it on the section
        // root would resolve against the section's 16px font, giving -0.8px.
        //
        // line-height: 1 tightens the line-box to glyph height — default
        // ~1.3 line-height bloats the box ~30% taller, throwing optical
        // vertical centering off when the parent uses place-items-center.
        style={{
          fontSize: "var(--kwr-font-size-vw)",
          letterSpacing: `${letterSpacingEm}em`,
          lineHeight: 1,
        }}
      >
        {chars.map((ch, i) =>
          ch === " " ? (
            // Render space as a non-hoverable gap.
            <span key={`s-${i}`} className="kwr-space">&nbsp;</span>
          ) : (
            <span key={`l-${i}`} className="kwr-letter relative inline-block">
              {ch}
            </span>
          ),
        )}
      </p>

      <style>{`
        .kwr-root .kwr-letter:has(.kwr-media) {
          color: transparent;
        }
        .kwr-root .kwr-media {
          position: absolute;
          width: var(--kwr-media-width-vw);
          /* Override Tailwind preflight (img { max-width: 100% }) — without
           * this, the image clamps to the parent letter's tiny width
           * (~60-80px) instead of expanding to var(--kwr-media-width-vw). */
          max-width: none;
          /* aspect-ratio: auto defers to the image's natural ratio. A
           * forced ratio (e.g. 4 / 5) combined with object-fit: cover gives
           * every tile the same size regardless of source dimensions. */
          aspect-ratio: var(--kwr-media-aspect);
          object-fit: var(--kwr-media-object-fit);
          top: 50%;
          left: 50%;
          border-radius: var(--kwr-media-radius-vw);
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
          will-change: transform;
        }
      `}</style>
    </section>
  );
}
