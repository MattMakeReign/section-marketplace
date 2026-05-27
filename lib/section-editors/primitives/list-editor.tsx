"use client";

import { useRef, useState } from "react";

/**
 * ListEditor — ordered list with drag-to-reorder + remove + add.
 *
 * Text is display-only — copy editing happens through the AI assistant, not
 * here. The control's job is structural: how many items, in what order, which
 * to drop.
 *
 * Drag UX:
 *   - Only the handle (⋮⋮) starts a drag — clicking text or the row body
 *     doesn't pick it up by accident.
 *   - During drag, the row becomes the drag ghost (via setDragImage).
 *   - Drop target shows a thin insertion line above the row where the item
 *     will land, rather than a border-colour swap (clearer "where it'll go").
 */

export type ListItem = { id: string; text: string };

export function ListEditor({
  value,
  onChange,
  addLabel = "+ Add item",
}: {
  value: ListItem[];
  onChange: (v: ListItem[]) => void;
  addLabel?: string;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  function handleHandleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    const rowEl = rowRefs.current.get(id);
    if (rowEl) {
      // Use the row itself as the drag image, not the tiny handle.
      const rect = rowEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(rowEl, rect.width / 2, rect.height / 2);
    }
  }
  function handleRowDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== draggingId) setDropTargetId(id);
  }
  function handleRowDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }
    const from = value.findIndex((it) => it.id === draggingId);
    const to = value.findIndex((it) => it.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setDraggingId(null);
    setDropTargetId(null);
  }
  function endDrag() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  function add() {
    onChange([
      ...value,
      { id: `l${Date.now()}`, text: `Item ${value.length + 1}` },
    ]);
  }
  function remove(id: string) {
    onChange(value.filter((it) => it.id !== id));
  }

  return (
    <div className="ds-list">
      {value.map((item) => (
        <div
          key={item.id}
          ref={(el) => {
            rowRefs.current.set(item.id, el);
          }}
          className="ds-list__row"
          data-dragging={draggingId === item.id ? "true" : "false"}
          data-drop-target={dropTargetId === item.id ? "true" : "false"}
          onDragOver={(e) => handleRowDragOver(e, item.id)}
          onDragLeave={() => dropTargetId === item.id && setDropTargetId(null)}
          onDrop={(e) => handleRowDrop(e, item.id)}
        >
          <span
            className="ds-list__handle"
            draggable
            onDragStart={(e) => handleHandleDragStart(e, item.id)}
            onDragEnd={endDrag}
            aria-label="Drag to reorder"
          >
            ⋮⋮
          </span>
          <span className="ds-list__text">{item.text}</span>
          <button
            type="button"
            className="ds-list__remove"
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.text}`}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="ds-list__add" onClick={add}>
        {addLabel}
      </button>
    </div>
  );
}
