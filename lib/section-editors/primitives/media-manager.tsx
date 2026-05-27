"use client";

import { useRef, useState } from "react";

/* eslint-disable @next/next/no-img-element */

/**
 * MediaManager — grid of image tiles with drag-to-reorder, replace-in-place,
 * remove, and add. Prototype scope: state is held in component, replace
 * uses local blob URLs. No real Supabase upload / folder I/O yet.
 *
 * The eventual integration mirrors the workflow you already shipped:
 *   - Designer drops files into the section's assets/ folder
 *   - mr submit ships them with the section
 *   - Marketplace bundles at build time
 *   - Designer in a client project swaps real photos at the same filenames
 *
 * This component's job in V1: give the user that "swap at the same filename"
 * affordance visually, so the contract is obvious.
 */

export type MediaItem = {
  id: string;
  src: string;
  filename: string;
};

export function MediaManager({
  items,
  onChange,
}: {
  items: MediaItem[];
  onChange: (next: MediaItem[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement | null>(null);

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Required for drag to fire in Firefox.
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== draggingId) setDropTargetId(id);
  }

  function handleDragLeave(id: string) {
    if (dropTargetId === id) setDropTargetId(null);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }
    const fromIdx = items.findIndex((it) => it.id === draggingId);
    const toIdx = items.findIndex((it) => it.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange(next);
    setDraggingId(null);
    setDropTargetId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  function handleRemove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function handleAdd(files: FileList) {
    const newItems: MediaItem[] = Array.from(files).map((file, i) => ({
      id: `m${Date.now()}-${i}`,
      src: URL.createObjectURL(file),
      filename: file.name,
    }));
    onChange([...items, ...newItems]);
  }

  return (
    <div className="ds-media">
      {items.map((item) => (
        <div
          key={item.id}
          className="ds-media__tile"
          draggable
          data-dragging={draggingId === item.id ? "true" : "false"}
          data-drop-target={dropTargetId === item.id ? "true" : "false"}
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={() => handleDragLeave(item.id)}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
        >
          <img className="ds-media__img" src={item.src} alt={item.filename} />
          <div className="ds-media__caption">{item.filename}</div>
          <button
            type="button"
            className="ds-media__remove"
            onClick={() => handleRemove(item.id)}
            aria-label={`Remove ${item.filename}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ds-media__add"
        onClick={() => addRef.current?.click()}
        aria-label="Add image"
      >
        +
      </button>
      <input
        ref={addRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleAdd(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
