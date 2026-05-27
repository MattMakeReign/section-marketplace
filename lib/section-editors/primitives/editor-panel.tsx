"use client";

import type { ReactNode } from "react";

/**
 * EditorPanel — floating panel container that wraps a section's controls.
 * No title bar; children are the accordion stack directly.
 */

export function EditorPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="ds-editor-panel" aria-label="Section editor">
      <div className="ds-editor-panel__body">{children}</div>
    </aside>
  );
}
