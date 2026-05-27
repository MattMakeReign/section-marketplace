"use client";

/**
 * useDialkitTheme — shared store for the dialkit panel theme inside the
 * builder canvas iframe. Returns `"light" | "dark"`, defaulting to `"dark"`
 * (dialkit's native palette) until the BuilderShell posts otherwise.
 *
 * Vendored copy of `@mr/canonical-stack/src/dialkit-theme.ts` — kept in
 * step with the upstream module. The marketplace's <SectionEditorMount />
 * subscribes here so the panel can pick up the host shell's light/dark
 * preference if one is ever posted in. Without a post the theme stays
 * "dark" (dialkit's native), which is what the marketplace previewer
 * wants by default.
 */

import { useSyncExternalStore } from "react";

export type DialkitTheme = "light" | "dark";

let current: DialkitTheme = "dark";
const listeners = new Set<() => void>();
let installed = false;

function emit() {
  for (const fn of listeners) fn();
}

function installListener() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;
  window.addEventListener("message", (ev: MessageEvent) => {
    const data = ev.data as { type?: unknown; theme?: unknown } | null;
    if (!data || typeof data !== "object") return;
    if (data.type !== "mr-canvas-theme") return;
    const next = data.theme === "light" ? "light" : "dark";
    if (next === current) return;
    current = next;
    emit();
  });
}

function subscribe(fn: () => void): () => void {
  installListener();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): DialkitTheme {
  return current;
}

// SSR: render with the dark default so the server output matches the client's
// first paint. The real theme arrives via postMessage after hydration.
function getServerSnapshot(): DialkitTheme {
  return "dark";
}

export function useDialkitTheme(): DialkitTheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
