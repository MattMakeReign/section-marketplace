/**
 * HoverSprayProse — editor.tsx (dialkit).
 *
 * Layout / Motion / Media. Motion knobs include hold-key shortcuts for fine
 * spawn/jitter adjustment.
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
import type { SprayItem, HoverSprayProseProps } from "./HoverSprayProse";

type EditorProps = Required<Pick<HoverSprayProseProps,
  | "items"
  | "heightVh" | "background"
  | "sentenceSizeVw" | "sentenceWidthPct"
  | "imageSizeVw" | "imageRadiusPx"
  | "spawnIntervalMs"
  | "yOffsetPx"
  | "jitterPx"
  | "rotationDeg"
>>;

const SECTION_ID = "hover-spray-prose";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: SprayItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: SprayItem[] = await Promise.all(
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
        <Slider
          label="Height"
          value={props.heightVh}
          onChange={(heightVh) => onChange({ heightVh })}
          min={50}
          max={120}
          step={1}
          unit="vh"
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
          label="Prose"
          value={props.sentenceSizeVw}
          onChange={(sentenceSizeVw) => onChange({ sentenceSizeVw })}
          min={2}
          max={10}
          step={0.1}
          unit="vw"
        />
        <Slider
          label="Width"
          value={props.sentenceWidthPct}
          onChange={(sentenceWidthPct) => onChange({ sentenceWidthPct })}
          min={40}
          max={100}
          step={1}
          unit="%"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Tile"
          value={props.imageSizeVw}
          onChange={(imageSizeVw) => onChange({ imageSizeVw })}
          min={5}
          max={40}
          step={0.5}
          unit="vw"
        />
        <Slider
          label="Radius"
          value={props.imageRadiusPx}
          onChange={(imageRadiusPx) => onChange({ imageRadiusPx })}
          min={0}
          max={120}
          step={1}
          unit="px"
        />
        <Slider
          label="Rate"
          value={props.spawnIntervalMs}
          onChange={(spawnIntervalMs) => onChange({ spawnIntervalMs })}
          min={50}
          max={500}
          step={10}
          unit="ms"
          shortcut={{ key: "r", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Drop"
          value={props.yOffsetPx}
          onChange={(yOffsetPx) => onChange({ yOffsetPx })}
          min={0}
          max={200}
          step={1}
          unit="px"
          shortcut={{ key: "d", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Spread"
          value={props.jitterPx}
          onChange={(jitterPx) => onChange({ jitterPx })}
          min={0}
          max={200}
          step={1}
          unit="px"
          shortcut={{ key: "j", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Tilt"
          value={props.rotationDeg}
          onChange={(rotationDeg) => onChange({ rotationDeg })}
          min={0}
          max={45}
          step={1}
          unit="°"
        />
      </Folder>
    </>
  );
};

export default Editor;
