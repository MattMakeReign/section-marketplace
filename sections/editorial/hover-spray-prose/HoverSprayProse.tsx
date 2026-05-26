"use client";

/**
 * HoverSprayProse — editorial prose with hover-triggered image spray.
 *
 * Adapted from the madewithgsap.com mwg_036 reference. Designers write a
 * sentence with select words wrapped in square brackets — `[audacious]` —
 * and those words render as underlined hover triggers. Hovering one starts
 * a spawn loop that drops a media tile every `spawnIntervalMs` at the word's
 * screen position, each tile flying in with a back.out spring and scaling
 * out after `scaleOutDelay`. Cycles through the media pool indefinitely
 * while the hover is held; stops when the cursor leaves the word.
 *
 * Why bracket syntax rather than a structured segments[] prop: bracket
 * markup makes the hero copy editable as a single text field — the writer
 * thinks in prose, not records. Parsing is cheap (one split per render).
 */

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

const SECTION_ID = "hover-spray-prose";

export type SprayItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type HoverSprayProseProps = {
  /** Small label above the sentence. Leave empty to hide. */
  eyebrow?: string;
  /** Sentence body. Wrap any word(s) you want to be hover triggers in
   *  square brackets, e.g. "We make [bold] and [audacious] clothing". */
  sentence?: string;
  /** Image pool. Spawned tiles cycle through this list in order. */
  items?: SprayItem[];
  /** Section viewport height (vh). */
  heightVh?: number;
  /** Surface tone. */
  background?: "dark" | "light";
  /** Sentence font size (vw). Reference: 5.6vw. */
  sentenceSizeVw?: number;
  /** Sentence max width as % of section. */
  sentenceWidthPct?: number;
  /** Spawned image size (vw). Reference: 20vw. */
  imageSizeVw?: number;
  /** Corner radius on spawned tiles (px). 0 = square. */
  imageRadiusPx?: number;
  /** Spawn interval (ms). Lower = denser stream. Reference: 150ms. */
  spawnIntervalMs?: number;
  /** Entrance tween duration. Reference: 0.4s. */
  appearSeconds?: number;
  /** Exit tween duration. Reference: 0.2s. */
  scaleOutSeconds?: number;
  /** Delay before exit starts. Reference: 0.5s. */
  scaleOutDelay?: number;
  /** Scale value at end of exit (1.0 = no shrink). Reference: 0.9. */
  popOutScale?: number;
  /** Max horizontal jitter on spawn (px). Reference: 50. */
  jitterPx?: number;
  /** Max rotation (±deg). Reference: 10. */
  rotationDeg?: number;
  /** Vertical offset to animate IN from (px below final). Reference: 50. */
  yOffsetPx?: number;
  /** Position passed by SectionsContainer. */
  position?: number;
};

import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<HoverSprayProseProps>;

export const DEFAULT_ITEMS: SprayItem[] = D.items;

/**
 * Parse `Foo [bar] baz [qux]` → segments. Square-bracketed runs become
 * hover triggers; everything else is plain text.
 */
function parseSentence(s: string): Array<{ text: string; hover: boolean }> {
  const out: Array<{ text: string; hover: boolean }> = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), hover: false });
    out.push({ text: m[1], hover: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), hover: false });
  return out;
}

export function HoverSprayProse({
  eyebrow = D.eyebrow,
  sentence = D.sentence,
  items = D.items,
  heightVh = D.heightVh,
  background = D.background,
  imageRadiusPx = D.imageRadiusPx,
  sentenceSizeVw = D.sentenceSizeVw,
  sentenceWidthPct = D.sentenceWidthPct,
  imageSizeVw = D.imageSizeVw,
  spawnIntervalMs = D.spawnIntervalMs,
  appearSeconds = D.appearSeconds,
  scaleOutSeconds = D.scaleOutSeconds,
  scaleOutDelay = D.scaleOutDelay,
  popOutScale = D.popOutScale,
  jitterPx = D.jitterPx,
  rotationDeg = D.rotationDeg,
  yOffsetPx = D.yOffsetPx,
}: HoverSprayProseProps = {}) {
  const rootRef = useRef<HTMLElement>(null);

  // Live config for the spawn loop so designer slider drags affect images
  // spawned AFTER the drag without rebinding event listeners.
  const cfgRef = useRef({
    items,
    imageSizeVw,
    imageRadiusPx,
    spawnIntervalMs,
    appearSeconds,
    scaleOutSeconds,
    scaleOutDelay,
    popOutScale,
    jitterPx,
    rotationDeg,
    yOffsetPx,
  });
  cfgRef.current = {
    items,
    imageSizeVw,
    imageRadiusPx,
    spawnIntervalMs,
    appearSeconds,
    scaleOutSeconds,
    scaleOutDelay,
    popOutScale,
    jitterPx,
    rotationDeg,
    yOffsetPx,
  };

  const segments = useMemo(() => parseSentence(sentence), [sentence]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const triggers = Array.from(root.querySelectorAll<HTMLElement>(".hsp-hover"));
    if (triggers.length === 0) return;

    let interval: number | undefined;
    let incr = 0;

    function startSpray(target: HTMLElement) {
      const cfg = cfgRef.current;
      if (cfg.items.length === 0) return;
      const bound = target.getBoundingClientRect();
      const rootRect = root!.getBoundingClientRect();
      // Position is RELATIVE to the section root (which is the absolute
      // positioning context for the spawned images).
      const distX = bound.left - rootRect.left + bound.width / 2;
      const distY = bound.top - rootRect.top + bound.height / 2;

      const tick = () => {
        const c = cfgRef.current;
        const item = c.items[incr % c.items.length];
        if (!item) return;
        const image = document.createElement("img");
        image.src = item.src;
        image.alt = "";
        image.className = "hsp-spawn";
        image.style.width = `${c.imageSizeVw}vw`;
        image.style.height = `${c.imageSizeVw}vw`;
        // cover (not contain) so every image fills the full tile box —
        // otherwise transparent letterbox space around portrait/landscape
        // sources eats the corner radius and only square-aspect images
        // appear rounded.
        image.style.objectFit = "cover";
        image.style.position = "absolute";
        image.style.top = "0";
        image.style.left = "0";
        image.style.pointerEvents = "none";
        image.style.maxWidth = "none";
        image.style.borderRadius = `${c.imageRadiusPx}px`;
        image.style.overflow = "hidden";
        root!.appendChild(image);

        gsap.fromTo(
          image,
          {
            xPercent: -50,
            yPercent: -50,
            x: distX + (Math.random() - 0.5) * c.jitterPx,
            y: distY + c.yOffsetPx,
            rotation: (Math.random() - 0.5) * c.rotationDeg,
          },
          {
            y: distY,
            rotation: (Math.random() - 0.5) * c.rotationDeg,
            ease: "back.out(3)",
            duration: c.appearSeconds,
          },
        );

        gsap.to(image, {
          scale: c.popOutScale,
          delay: c.scaleOutDelay,
          duration: c.scaleOutSeconds,
          ease: "back.in(2)",
          onComplete: () => {
            if (image.parentNode === root) root!.removeChild(image);
          },
        });

        incr++;
      };

      // Fire one immediately so the spray feels responsive on hover, then
      // continue at the configured interval.
      tick();
      interval = window.setInterval(tick, cfg.spawnIntervalMs);
    }

    function stopSpray() {
      if (interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
    }

    const enterHandlers: Array<() => void> = [];
    triggers.forEach((trigger) => {
      const onEnter = () => startSpray(trigger);
      const onLeave = () => stopSpray();
      trigger.addEventListener("mouseenter", onEnter);
      trigger.addEventListener("mouseleave", onLeave);
      enterHandlers.push(() => {
        trigger.removeEventListener("mouseenter", onEnter);
        trigger.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => {
      stopSpray();
      enterHandlers.forEach((cleanup) => cleanup());
      // Sweep any in-flight spawned images so a hot-reload / unmount doesn't
      // leak DOM nodes mid-tween.
      root.querySelectorAll(".hsp-spawn").forEach((n) => n.remove());
    };
  }, [segments]);

  // On the default (dark) surface, `--fg` is the project's primary text
  // colour. When the section is flipped to light, swap to the inverse pair so
  // `--surface-inverse` (the light fill) gets `--fg-inverse` (the dark text).
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
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="hsp-root relative w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ gap: "4vw", ...sectionStyle }}
    >
      {eyebrow ? (
        // Eyebrow uses the project's DS H6/eyebrow token (1rem, weight 500),
        // uppercased + tracked per the eyebrow convention noted in theme.css.
        <p
          className="hsp-eyebrow"
          style={{
            fontSize: "var(--text-heading-6)",
            lineHeight: "var(--text-heading-6--line-height)",
            fontWeight: "var(--text-heading-6--font-weight)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
      ) : null}

      <p
        className="hsp-sentence"
        style={{
          width: `${sentenceWidthPct}%`,
          fontSize: `${sentenceSizeVw}vw`,
          lineHeight: 1,
          letterSpacing: "-0.05em",
          textAlign: "center",
        }}
      >
        {segments.map((seg, i) =>
          seg.hover ? (
            <span
              key={i}
              className="hsp-hover"
              style={{
                textDecoration: "underline",
                textDecorationThickness: "0.06em",
                textUnderlineOffset: "0.1em",
                cursor: "pointer",
              }}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
    </section>
  );
}
