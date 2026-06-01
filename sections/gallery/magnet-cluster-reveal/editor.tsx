/**
 * MagnetClusterReveal — editor.tsx (dialkit).
 *
 * Layout / motion / media only — no Show/Hide toggles, no text inputs.
 * Folders: Media (closed by default, designers reach for motion first)
 * → Layout → Motion.
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
import type { MagnetItem, MagnetClusterRevealProps } from "./MagnetClusterReveal";

type EditorProps = Required<Pick<MagnetClusterRevealProps,
  | "items"
  | "pinLengthVh"
  | "background"
  | "imageSizeVw"
  | "imageSizeVwMobile"
  | "imageRadiusPx"
  | "forceStrength"
  | "airFriction"
  | "popStartScale"
  | "popDurationSec"
>>;

const SECTION_ID = "magnet-cluster-reveal";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: MagnetItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: MagnetItem[] = await Promise.all(
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

          return {
            id: item.id,
            src: finalSrc,
            filename: finalFilename,
            alt: "",
          };
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
          min={150}
          max={600}
          step={10}
          unit="vh"
        />
        <Slider
          label="Tile"
          value={props.imageSizeVw}
          onChange={(imageSizeVw) => onChange({ imageSizeVw })}
          min={6}
          max={24}
          step={0.5}
          unit="vw"
        />
        <Slider
          label="Mobile"
          value={props.imageSizeVwMobile}
          onChange={(imageSizeVwMobile) => onChange({ imageSizeVwMobile })}
          min={12}
          max={40}
          step={0.5}
          unit="vw"
        />
        <Slider
          label="Radius"
          value={props.imageRadiusPx}
          onChange={(imageRadiusPx) => onChange({ imageRadiusPx })}
          min={0}
          max={40}
          step={1}
          unit="px"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Magnet"
          value={props.forceStrength}
          onChange={(forceStrength) => onChange({ forceStrength })}
          min={0.0001}
          max={0.002}
          step={0.0001}
          shortcut={{ key: "m", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Friction"
          value={props.airFriction}
          onChange={(airFriction) => onChange({ airFriction })}
          min={0.005}
          max={0.1}
          step={0.005}
          shortcut={{ key: "f", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Pop"
          value={props.popStartScale}
          onChange={(popStartScale) => onChange({ popStartScale })}
          min={0.3}
          max={1.0}
          step={0.05}
          shortcut={{ key: "p", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Speed"
          value={props.popDurationSec}
          onChange={(popDurationSec) => onChange({ popDurationSec })}
          min={0.1}
          max={1.0}
          step={0.05}
          unit="s"
          shortcut={{ key: "s", mode: "fine", interaction: "scroll" }}
        />
      </Folder>
    </>
  );
};

export default Editor;
