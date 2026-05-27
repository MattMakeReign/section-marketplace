/**
 * HorizontalScrollRows — editor.tsx (dialkit).
 *
 * Layout: Rows (2/3/4), tone, scrub length, gaps, radius, edge padding.
 * Motion: direction (left/right/alternating), scroll bias multiplier.
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
  ScrollRowItem,
  HorizontalScrollRowsProps,
  RowDirection,
} from "./HorizontalScrollRows";

type EditorProps = Required<Pick<HorizontalScrollRowsProps,
  | "items" | "rows" | "pinLengthVh" | "background"
  | "tileGapPx" | "rowGapPx" | "imageRadiusPx" | "edgePaddingPx"
  | "direction" | "scrollBias"
>>;

const SECTION_ID = "horizontal-scroll-rows";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: ScrollRowItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: ScrollRowItem[] = await Promise.all(
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
          label="Rows"
          value={String(props.rows)}
          onChange={(v) => onChange({ rows: Number(v) as 2 | 3 | 4 })}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
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
          label="Length"
          value={props.pinLengthVh}
          onChange={(pinLengthVh) => onChange({ pinLengthVh })}
          min={200}
          max={800}
          step={25}
          unit="vh"
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
          label="Stack"
          value={props.rowGapPx}
          onChange={(rowGapPx) => onChange({ rowGapPx })}
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
        <Slider
          label="Edge"
          value={props.edgePaddingPx}
          onChange={(edgePaddingPx) => onChange({ edgePaddingPx })}
          min={0}
          max={96}
          step={2}
          unit="px"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <SelectControl
          label="Flow"
          value={props.direction}
          onChange={(v) => onChange({ direction: v as RowDirection })}
          options={[
            { value: "left", label: "← Left" },
            { value: "right", label: "Right →" },
            { value: "alternating", label: "⇄ Alt" },
          ]}
        />
        <Slider
          label="Bias"
          value={props.scrollBias}
          onChange={(scrollBias) => onChange({ scrollBias })}
          min={0.5}
          max={1.5}
          step={0.05}
          shortcut={{ key: "b", mode: "fine", interaction: "scroll" }}
        />
      </Folder>
    </>
  );
};

export default Editor;
