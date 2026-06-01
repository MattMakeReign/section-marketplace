"use client";

/**
 * MagnetClusterReveal — scroll-driven physics reveal cluster.
 *
 * Adapted from the madewithgsap.com mwg_096 reference. Layout / structure /
 * interaction logic only — all CDN refs and hardcoded sizes stripped.
 *
 * Mechanics:
 *   - The section reserves `pinLengthVh` of vertical space. A 100vh inner
 *     container is pinned via ScrollTrigger while you scroll through it.
 *   - As scroll progress crosses each item's threshold ((i+1)/N), that item's
 *     Matter.js body is added to the world and the image pops in. Scrolling
 *     back removes the body and resets its seed position.
 *   - Every frame, each active body has a magnetic force applied toward the
 *     centre of the viewport, so bodies cluster but bounce off each other.
 *   - gsap.ticker runs the physics step + transform writes; ScrollTrigger
 *     enter/leave callbacks pause it when the section is off-screen.
 *
 * Tunable via cfgRef (no re-init) — forceStrength, airFriction, popStartScale,
 * popDurationSec. Re-init only when items list / pin length / image sizes
 * change (those affect body geometry or scroll math).
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Matter from "matter-js";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SECTION_ID = "magnet-cluster-reveal";

export type MagnetItem = {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
};

export type MagnetClusterRevealProps = {
  items?: MagnetItem[];
  /** Section vertical length, in viewport heights. Higher = longer pinned scrub. */
  pinLengthVh?: number;
  /** Section tone. */
  background?: "dark" | "light";
  /** Image size as % of viewport width (desktop). */
  imageSizeVw?: number;
  /** Image size as % of viewport width (≤ 768px). */
  imageSizeVwMobile?: number;
  /** Image corner radius, in px. */
  imageRadiusPx?: number;
  /** Magnet pull strength toward centre. Higher = images snap inward faster. */
  forceStrength?: number;
  /** Air friction of the physics bodies. Higher = bodies decelerate faster. */
  airFriction?: number;
  /** Starting scale of the pop-in (< 1 = grow into view, > 1 = shrink into view). */
  popStartScale?: number;
  /** Pop-in duration in seconds. */
  popDurationSec?: number;
  /** Injected by SectionsContainer. */
  position?: number;
};

import sampleJson from "./sample.json";
const D = sampleJson.props as unknown as Required<MagnetClusterRevealProps>;

export const DEFAULT_ITEMS: MagnetItem[] = D.items;

export function MagnetClusterReveal({
  items = D.items,
  pinLengthVh = D.pinLengthVh,
  background = D.background,
  imageSizeVw = D.imageSizeVw,
  imageSizeVwMobile = D.imageSizeVwMobile,
  imageRadiusPx = D.imageRadiusPx,
  forceStrength = D.forceStrength,
  airFriction = D.airFriction,
  popStartScale = D.popStartScale,
  popDurationSec = D.popDurationSec,
}: MagnetClusterRevealProps = {}) {
  const rootRef = useRef<HTMLElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const mediasRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  // Live config so slider drags don't tear down the physics engine.
  const cfgRef = useRef({ forceStrength, airFriction, popStartScale, popDurationSec });
  cfgRef.current = { forceStrength, airFriction, popStartScale, popDurationSec };

  useEffect(() => {
    const root = rootRef.current;
    const pinTarget = pinTargetRef.current;
    const mediasEl = mediasRef.current;
    if (!root || !pinTarget || !mediasEl) return;

    const mediaElements = Array.from(mediasEl.querySelectorAll<HTMLDivElement>(".magnet-media"));
    if (mediaElements.length === 0) return;

    let alive = true;
    const imgs = mediaElements
      .map((el) => el.querySelector<HTMLImageElement>("img"))
      .filter((img): img is HTMLImageElement => img !== null);

    const allLoaded = Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );

    const triggers: ScrollTrigger[] = [];
    let runner: Matter.Runner | undefined;
    let engine: Matter.Engine | undefined;
    let tickFn: gsap.TickerCallback | undefined;

    allLoaded.then(() => {
      if (!alive) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const centerX = vw / 2;
      const centerY = vh / 2;

      const { Engine, World, Bodies, Runner, Body } = Matter;
      engine = Engine.create({ gravity: { x: 0, y: 0 } });
      const world = engine.world;

      const mediaItems = mediaElements.map((el) => {
        const img = el.querySelector<HTMLImageElement>("img");
        if (img && img.naturalWidth > img.naturalHeight) img.classList.add("landscape");
        const w = el.clientWidth;
        const h = el.clientHeight;
        const body = Bodies.rectangle(
          centerX + (Math.random() - 0.5) * 0.6 * vw,
          centerY + (Math.random() - 0.5) * 0.4 * vh,
          w,
          h,
          { frictionAir: cfgRef.current.airFriction },
        );
        el.style.visibility = "hidden";
        return { el, body, w, h };
      });

      const manageVisibility = (progress: number) => {
        mediaItems.forEach((item, i) => {
          const threshold = mediaItems.length > 1 ? (i + 1) / mediaItems.length : 0;
          const inWorld = world.bodies.includes(item.body);
          if (progress >= threshold && !inWorld) {
            Body.setAngle(item.body, 0);
            World.add(world, item.body);
            const innerImg = item.el.querySelector("img");
            if (innerImg) {
              gsap.from(innerImg, {
                scale: cfgRef.current.popStartScale,
                duration: cfgRef.current.popDurationSec,
                ease: "back.out(3.5)",
              });
            }
            item.el.style.visibility = "visible";
          } else if (progress < threshold && inWorld) {
            World.remove(world, item.body);
            item.el.style.visibility = "hidden";
            Body.setPosition(item.body, {
              x: centerX + (Math.random() - 0.5) * 0.6 * vw,
              y: centerY + (Math.random() - 0.5) * 0.4 * vh,
            });
          }
        });
      };

      runner = Runner.create();
      Runner.run(runner, engine);

      // Hint fade — plays as soon as the section pins.
      if (hintRef.current) {
        gsap.to(hintRef.current, {
          autoAlpha: 0,
          duration: 0.2,
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "top top-=1",
            toggleActions: "play none reverse none",
          },
        });
      }

      // Pin + scrub on the SAME trigger so onUpdate fires while pinned.
      const pinTrigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        pin: pinTarget,
        scrub: true,
        onUpdate: (self) => manageVisibility(self.progress),
      });
      triggers.push(pinTrigger);

      tickFn = () => {
        const cfg = cfgRef.current;
        mediaItems.forEach(({ el, body, w, h }) => {
          // Keep air friction live so the slider feels immediate.
          body.frictionAir = cfg.airFriction;
          if (!world.bodies.includes(body)) return;
          Body.applyForce(body, body.position, {
            x: (centerX - body.position.x) * cfg.forceStrength,
            y: (centerY - body.position.y) * cfg.forceStrength,
          });
          el.style.transform = `translate(${body.position.x - w / 2}px, ${
            body.position.y - h / 2
          }px) rotate(${body.angle}rad)`;
        });
      };

      // Add the per-frame writer immediately so the simulation runs the
      // moment the section mounts — ScrollTrigger.onEnter doesn't fire for
      // triggers that are already-active at init (which is the case when the
      // section is the first thing on the page). The vis-trigger below then
      // pauses / resumes the ticker as the user scrolls in and out of view.
      gsap.ticker.add(tickFn);
      let tickerRunning = true;

      const visTrigger = ScrollTrigger.create({
        trigger: root,
        onToggle: (self) => {
          if (!tickFn) return;
          if (self.isActive && !tickerRunning) {
            gsap.ticker.add(tickFn);
            tickerRunning = true;
          } else if (!self.isActive && tickerRunning) {
            gsap.ticker.remove(tickFn);
            tickerRunning = false;
          }
        },
      });
      triggers.push(visTrigger);

      ScrollTrigger.refresh();
    });

    return () => {
      alive = false;
      if (tickFn) gsap.ticker.remove(tickFn);
      triggers.forEach((t) => t.kill());
      if (runner) Matter.Runner.stop(runner);
      if (engine) {
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
      }
      mediaElements.forEach((el) => {
        el.style.transform = "";
        el.style.visibility = "hidden";
      });
    };
    // Only item count forces a full re-init (body count changes). Length,
    // image sizes, radius, and motion knobs are all handled live via cfgRef
    // or CSS vars — re-initing on those would re-seed the bodies at random
    // positions and the cluster would look "exploded" until they converge
    // again. Length changes call ScrollTrigger.refresh() from the separate
    // effect below so the pin's end-position picks up the new section height.
  }, [items.length]);

  // Recompute pin position when the section height changes (length slider).
  useEffect(() => {
    if (typeof window === "undefined") return;
    ScrollTrigger.refresh();
  }, [pinLengthVh]);

  const sectionStyle: React.CSSProperties = {
    height: `${pinLengthVh}vh`,
    background:
      background === "dark"
        ? "var(--surface, #121212)"
        : "var(--surface-inverse, #fdfcfc)",
    color: background === "dark" ? "#F1F1F1" : "#121212",
    ["--magnet-media-size" as string]: `${imageSizeVw}vw`,
    ["--magnet-media-size-mobile" as string]: `${imageSizeVwMobile}vw`,
    ["--magnet-media-radius" as string]: `${imageRadiusPx}px`,
  };

  return (
    <section
      ref={rootRef}
      data-section-id={SECTION_ID}
      className="magnet-cluster-reveal-root relative w-full"
      style={sectionStyle}
    >
      <div
        ref={pinTargetRef}
        className="magnet-cluster-reveal-pin relative w-full overflow-hidden"
        style={{ height: "100vh" }}
      >
        <p
          ref={hintRef}
          className="magnet-cluster-reveal-hint absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-medium pointer-events-none select-none"
        >
          Scroll
        </p>
        <div ref={mediasRef} className="magnet-cluster-reveal-medias absolute inset-0">
          {items.map((it) => (
            <div key={it.id} className="magnet-media absolute top-0 left-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt={it.alt ?? ""} draggable={false} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .magnet-cluster-reveal-root .magnet-media img {
          width: var(--magnet-media-size);
          height: auto;
          display: block;
          border-radius: var(--magnet-media-radius);
          user-select: none;
          -webkit-user-drag: none;
          will-change: transform;
          max-width: none;
        }
        .magnet-cluster-reveal-root .magnet-media img.landscape {
          width: auto;
          height: var(--magnet-media-size);
        }
        @media (max-width: 768px) {
          .magnet-cluster-reveal-root .magnet-media img {
            width: var(--magnet-media-size-mobile);
          }
          .magnet-cluster-reveal-root .magnet-media img.landscape {
            height: var(--magnet-media-size-mobile);
          }
        }
      `}</style>
    </section>
  );
}
