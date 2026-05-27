/**
 * CursorTrailSpray — editor.tsx (dialkit).
 *
 * Layout / Motion / Media. Pattern matches sphere-rotate: dialkit's <Folder>,
 * <Slider>, <SelectControl> with MediaManager from @mr/section-editors.
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
import type { TrailItem, CursorTrailSprayProps } from "./CursorTrailSpray";

type EditorProps = Required<Pick<CursorTrailSprayProps,
  | "items"
  | "heightVh" | "background" | "titleSizeVw" | "titleWidthPct"
  | "imageSizeVw" | "imageRadiusPct"
  | "trailDistanceFactor"
  | "driftMultiplier"
  | "initialScale"
  | "rotationDeg"
>>;

const SECTION_ID = "cursor-trail-spray";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: TrailItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: TrailItem[] = await Promise.all(
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
          min={60}
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
          label="Title"
          value={props.titleSizeVw}
          onChange={(titleSizeVw) => onChange({ titleSizeVw })}
          min={4}
          max={16}
          step={0.1}
          unit="vw"
        />
        <Slider
          label="Width"
          value={props.titleWidthPct}
          onChange={(titleWidthPct) => onChange({ titleWidthPct })}
          min={30}
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
          max={30}
          step={0.5}
          unit="vw"
        />
        <Slider
          label="Radius"
          value={props.imageRadiusPct}
          onChange={(imageRadiusPct) => onChange({ imageRadiusPct })}
          min={0}
          max={50}
          step={0.5}
          unit="%"
        />
        <Slider
          label="Trail"
          value={props.trailDistanceFactor}
          onChange={(trailDistanceFactor) => onChange({ trailDistanceFactor })}
          min={0.02}
          max={0.4}
          step={0.005}
          shortcut={{ key: "t", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Travel"
          value={props.driftMultiplier}
          onChange={(driftMultiplier) => onChange({ driftMultiplier })}
          min={0}
          max={12}
          step={0.1}
          shortcut={{ key: "d", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Bounce"
          value={props.initialScale}
          onChange={(initialScale) => onChange({ initialScale })}
          min={0.8}
          max={2}
          step={0.05}
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
