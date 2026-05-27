"use client";

/**
 * <SectionEditorMount /> — marketplace edition.
 *
 * Same dialkit panel + Edit pill that designers see when a section is
 * installed into a project (canonical source: `mr-gsap-lab-dialkit/components/
 * section-editor-mount.tsx`). The marketplace strips the project-only
 * actions:
 *   - Save defaults  → no project to write sample.json into.
 *   - ⋯ Duplicate / Delete / Submit  → no page context, no local agent.
 *
 * Sliders + toggles + MediaManager still work as a live preview — the user
 * can demo the section's knobs before installing. Edits are in-memory only.
 *
 * The 5th top-right circle on the marketplace detail page postMessages this
 * mount (`{ type: "mr:editor-toggle" }`) so the parent toolbar can drive the
 * open/close state from outside the iframe.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import type { SectionEditor } from "@mr/section-editors";
import { useDialkitTheme } from "@mr/canonical-stack";

// Loose typing matches the canonical mount — each editor.tsx narrows via
// its own `Required<Pick<…>>` shape; the mount is plumbing.
type AnyProps = Record<string, unknown>;

// The marketplace detail page floats its own top-right toolbar (viewport
// toggle on the left, info / edit / refresh / controller-toggle / close
// on the right) at the very top of the page, OUTSIDE the iframe. The
// project-mount inset (16px from the iframe's own top) would land the
// panel at the same y as that toolbar, so the parent buttons paint OVER
// the panel header. 88px clears the toolbar (top ≈ 24, height ≈ 42 →
// bottom ≈ 66) by ~22px so the panel reads as clearly "below" the
// toolbar rather than abutting it.
const STICKY_TOP_PX = 88;
const BOTTOM_GAP_PX = 16;

export function SectionEditorMount({
  section: SectionComponent,
  editor: EditorComponent,
  defaultProps,
  label,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  section: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: SectionEditor<any>;
  defaultProps: AnyProps;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [props, setProps] = useState<AnyProps>(defaultProps);
  const dialkitTheme = useDialkitTheme();

  // Resync if defaultProps changes (HMR / route nav). Marketplace doesn't
  // persist to localStorage — preview is ephemeral, so this is simpler than
  // the project mount.
  const prevDefaultsRef = useRef<AnyProps>(defaultProps);
  useEffect(() => {
    setProps((prev) => {
      let patched: AnyProps | null = null;
      const prevDefaults = prevDefaultsRef.current;
      for (const k of Object.keys(defaultProps)) {
        const liveVal = prev[k];
        const prevDefault = prevDefaults[k];
        const newDefault = defaultProps[k];
        if (liveVal === undefined && newDefault !== undefined) {
          if (!patched) patched = { ...prev };
          patched[k] = newDefault;
          continue;
        }
        if (newDefault !== prevDefault && liveVal === prevDefault) {
          if (!patched) patched = { ...prev };
          patched[k] = newDefault;
        }
      }
      return patched ?? prev;
    });
    prevDefaultsRef.current = defaultProps;
  }, [defaultProps]);

  const onChange = useCallback((next: Partial<AnyProps>) => {
    setProps((prev) => ({ ...prev, ...next }));
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((cur) => !cur);
  }, []);

  // Esc closes the panel.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // postMessage bridge — the marketplace detail page's 5th top-right circle
  // sits OUTSIDE the iframe; it posts `mr:editor-toggle` to flip the panel.
  // Two messages are accepted:
  //   { type: "mr:editor-toggle" }     → toggles
  //   { type: "mr:editor-set", open }  → forces a state
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "mr:editor-toggle") setIsOpen((cur) => !cur);
      else if (data.type === "mr:editor-set" && typeof data.open === "boolean") {
        setIsOpen(data.open);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Notify the parent page when the panel state changes so the toolbar
  // button's pressed state can mirror the iframe's actual state (e.g. if
  // the user hits Esc to close).
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ type: "mr:editor-state", open: isOpen }, "*");
  }, [isOpen]);

  // Sticky-with-push via rAF — same approach as the canonical mount.
  // Marketplace's /render route is iframed (no parent chrome above), so
  // top:16 is the natural inset.
  const [isPinned, setIsPinned] = useState(false);
  const [effectiveTopPx, setEffectiveTopPx] = useState(STICKY_TOP_PX);
  const mountRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let raf = 0;
    let alive = true;
    function tick() {
      if (!alive) return;
      const el = mountRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const chromeEl = chromeRef.current ?? bubbleRef.current;
        const chromeH = chromeEl ? chromeEl.getBoundingClientRect().height : 40;
        const maxTop = rect.bottom - chromeH - BOTTOM_GAP_PX;
        const nextTop = Math.min(STICKY_TOP_PX, maxTop);
        const pinned = rect.top <= STICKY_TOP_PX && nextTop > -chromeH;
        setIsPinned((prev) => (prev === pinned ? prev : pinned));
        setEffectiveTopPx((prev) => (prev === nextTop ? prev : nextTop));
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Array-length-only key — see canonical mount for the long version. TL;DR:
  // remounting on every scalar prop drag breaks ScrollTrigger / rAF sections;
  // only count changes (which need useReveal re-bind) should remount.
  const propsKey = JSON.stringify(
    Object.entries(props).reduce<Record<string, number>>((acc, [k, v]) => {
      if (Array.isArray(v)) acc[k] = v.length;
      return acc;
    }, {}),
  );

  return (
    <div ref={mountRef} className="mr-editor-mount" style={{ position: "relative" }}>
      {/* No CLOSED-state bubble in the marketplace mount. The detail page's
       * top-right Controller circle is the only entry point — keeping the
       * project mount's in-iframe Edit bubble here would duplicate the
       * affordance (parent circle + iframe bubble both visible at once). */}

      {/* OPEN — dialkit panel with slim toolbar: [title] [× close]. The
       * project mount also shows Save + ⋯ here; both are project-only and
       * intentionally omitted from the marketplace edition. */}
      {isOpen ? (
        <div
          ref={chromeRef}
          role="dialog"
          aria-label={`${label} controls`}
          className="dialkit-root"
          data-theme={dialkitTheme}
          style={{
            position: isPinned ? "fixed" : "absolute",
            top: isPinned ? effectiveTopPx : STICKY_TOP_PX,
            right: 16,
            zIndex: 19,
            width: 280,
          }}
        >
          <div
            className="dialkit-panel-inner"
            style={{
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              boxShadow: "var(--dial-shadow)",
              position: "relative",
            }}
          >
            <PanelToolbar label={label} onClose={toggleOpen} />
            <EditorComponent props={props} onChange={onChange} />
          </div>
        </div>
      ) : null}

      <SectionComponent {...props} key={propsKey} />
    </div>
  );
}

/* ─────────────────────────── Chrome bits ─────────────────────────── */

function SlidersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <line x1="2.5" y1="5" x2="13.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5" y1="11" x2="13.5" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="5" r="1.75" fill="currentColor" />
      <circle cx="6" cy="11" r="1.75" fill="currentColor" />
    </svg>
  );
}

function PanelToolbar({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingBottom: 8,
        marginBottom: 4,
        minHeight: 22,
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--dial-text-root, #ffffff)",
          letterSpacing: "-0.01em",
        }}
        title={label}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${label} controls`}
        title={`Close ${label} controls`}
        style={{
          width: 26,
          height: 26,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: 6,
          color: "var(--dial-text-label, rgba(255,255,255,0.7))",
          cursor: "pointer",
          transition: "background 150ms, color 150ms",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
