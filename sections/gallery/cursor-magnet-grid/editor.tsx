/**
 * CursorMagnetGrid — editor.tsx (dialkit).
 *
 * Media → Layout → Motion. Uses dialkit's <Folder>/<Slider>/<Toggle>/<SelectControl>
 * with the dark glassmorphic shell provided by SectionEditorMount's .dialkit-root
 * wrapper. MediaManager stays from @mr/section-editors (no dialkit equivalent
 * for uploads).
 */

"use client";

import { useCallback } from "react";
import { Folder, Slider, SelectControl } from "dialkit";
import "dialkit/styles.css";
import {
  MediaManager,
  type MediaItem,
  type SectionEditor,
} from "@mr/section-editors";
import { useAssetUpload } from "@/components/use-asset-upload";
import type {
  MagnetTileItem,
  CursorMagnetGridProps,
} from "./CursorMagnetGrid";

type EditorProps = Required<Pick<CursorMagnetGridProps,
  | "items" | "columns" | "background"
  | "tileSizeVw" | "tileGapPx" | "imageRadiusPx"
  | "baseScale" | "activeScale" | "pushForce"
  | "jitterPercent" | "jitterRotation" | "durationSec"
>>;

const SECTION_ID = "cursor-magnet-grid";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: MagnetTileItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: MagnetTileItem[] = await Promise.all(
        next.map(async (item) => {
          const existing = props.items.find((s) => s.id === item.id);
          if (existing && !item.src.startsWith("blob:")) return existing;

          let finalSrc = item.src;
          let finalFilename = item.filename;
          if (item.src.startsWith("blob:")) {
            try {
              const blob = await fetch(item.src).then((r) => r.blob());
              const cleanName = item.filename.replace(/[^\w.\-]/g, "_");
              await upload(`${ASSETS_DIR}/${cleanName}`, blob);
              finalFilename = cleanName;
              finalSrc = `/api/section-asset/${SECTION_ID}/${cleanName}?v=${Date.now()}`;
            } catch (err) {
              console.error("Asset upload failed:", err);
            }
          }

          return { id: item.id, src: finalSrc, filename: finalFilename, alt: "" };
        }),
      );
      onChange({ items: nextItems });
    },
    [props.items, onChange, upload],
  );

  return (
    <>
      <Folder title="Media" defaultOpen={false}>
        <MediaManager items={items} onChange={handleMediaChange} />
      </Folder>

      <Folder title="Layout" defaultOpen>
        <SelectControl
          label="Columns"
          value={String(props.columns)}
          onChange={(v) => onChange({ columns: Number(v) as 3 | 4 | 5 | 6 })}
          options={[
            { value: "3", label: "3" },
            { value: "4", label: "4" },
            { value: "5", label: "5" },
            { value: "6", label: "6" },
          ]}
        />
        <SelectControl
          label="Tone"
          value={props.background}
          onChange={(v) => onChange({ background: v as "dark" | "light" })}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
        <Slider
          label="Size"
          value={props.tileSizeVw}
          onChange={(tileSizeVw) => onChange({ tileSizeVw })}
          min={6}
          max={20}
          step={0.5}
          unit="vw"
        />
        <Slider
          label="Gap"
          value={props.tileGapPx}
          onChange={(tileGapPx) => onChange({ tileGapPx })}
          min={0}
          max={48}
          step={1}
          unit="px"
        />
        <Slider
          label="Radius"
          value={props.imageRadiusPx}
          onChange={(imageRadiusPx) => onChange({ imageRadiusPx })}
          min={0}
          max={48}
          step={1}
          unit="px"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Push"
          value={props.pushForce}
          onChange={(pushForce) => onChange({ pushForce })}
          min={0}
          max={200}
          step={5}
          shortcut={{ key: "p", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Jitter"
          value={props.jitterPercent}
          onChange={(jitterPercent) => onChange({ jitterPercent })}
          min={0}
          max={60}
          step={1}
          unit="%"
          shortcut={{ key: "j", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Rotation"
          value={props.jitterRotation}
          onChange={(jitterRotation) => onChange({ jitterRotation })}
          min={0}
          max={90}
          step={1}
          unit="°"
          shortcut={{ key: "r", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Rest"
          value={props.baseScale}
          onChange={(baseScale) => onChange({ baseScale })}
          min={0.8}
          max={1.4}
          step={0.05}
        />
        <Slider
          label="Active"
          value={props.activeScale}
          onChange={(activeScale) => onChange({ activeScale })}
          min={1}
          max={2.4}
          step={0.05}
        />
        <Slider
          label="Speed"
          value={props.durationSec}
          onChange={(durationSec) => onChange({ durationSec })}
          min={0.2}
          max={2}
          step={0.05}
          unit="s"
          shortcut={{ key: "s", mode: "fine", interaction: "scroll" }}
        />
      </Folder>
    </>
  );
};

export default Editor;
