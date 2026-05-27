/**
 * KineticWordReveal — editor.tsx (dialkit).
 *
 * Word text is intentionally NOT exposed here — content is inline-edited on
 * the canvas. Controller stays focused on layout / motion / media.
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
import type { RevealItem, KineticWordRevealProps, MediaAspect } from "./KineticWordReveal";

type EditorProps = Required<Pick<KineticWordRevealProps,
  | "items" | "heightVh" | "background"
  | "fontWeight" | "fontSizeVw" | "mediaWidthVw" | "mediaAspect" | "mediaRadiusVw" | "mediaGapVw" | "letterSpacingEm"
  | "pushSeconds" | "holdSeconds" | "tiltDeg" | "popScale"
>>;

const SECTION_ID = "kinetic-word-reveal";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: RevealItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: RevealItem[] = await Promise.all(
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
          label="Size"
          value={props.fontSizeVw}
          onChange={(fontSizeVw) => onChange({ fontSizeVw })}
          min={4}
          max={18}
          step={0.25}
          unit="vw"
        />
        <SelectControl
          label="Weight"
          value={String(props.fontWeight)}
          onChange={(v) => onChange({ fontWeight: Number(v) })}
          options={[
            { value: "500", label: "Medium" },
            { value: "700", label: "Bold" },
            { value: "800", label: "Extra" },
            { value: "900", label: "Ultra" },
          ]}
        />
        <Slider
          label="Track"
          value={props.letterSpacingEm}
          onChange={(letterSpacingEm) => onChange({ letterSpacingEm })}
          min={-0.08}
          max={0.08}
          step={0.005}
          shortcut={{ key: "t", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Tile"
          value={props.mediaWidthVw}
          onChange={(mediaWidthVw) => onChange({ mediaWidthVw })}
          min={3}
          max={22}
          step={0.25}
          unit="vw"
        />
        <SelectControl
          label="Shape"
          value={props.mediaAspect}
          onChange={(v) => onChange({ mediaAspect: v as MediaAspect })}
          options={[
            { value: "portrait", label: "4:5" },
            { value: "square", label: "1:1" },
            { value: "landscape", label: "4:3" },
            { value: "auto", label: "Auto" },
          ]}
        />
        <Slider
          label="Radius"
          value={props.mediaRadiusVw}
          onChange={(mediaRadiusVw) => onChange({ mediaRadiusVw })}
          min={0}
          max={4}
          step={0.05}
          unit="vw"
        />
        <Slider
          label="Gap"
          value={props.mediaGapVw}
          onChange={(mediaGapVw) => onChange({ mediaGapVw })}
          min={0}
          max={6}
          step={0.1}
          unit="vw"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Push"
          value={props.pushSeconds}
          onChange={(pushSeconds) => onChange({ pushSeconds })}
          min={0.1}
          max={1.2}
          step={0.02}
          unit="s"
          shortcut={{ key: "p", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Hold"
          value={props.holdSeconds}
          onChange={(holdSeconds) => onChange({ holdSeconds })}
          min={0.4}
          max={4}
          step={0.05}
          unit="s"
          shortcut={{ key: "h", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Tilt"
          value={props.tiltDeg}
          onChange={(tiltDeg) => onChange({ tiltDeg })}
          min={0}
          max={45}
          step={1}
          unit="°"
        />
        <Slider
          label="Pop"
          value={props.popScale}
          onChange={(popScale) => onChange({ popScale })}
          min={1}
          max={1.3}
          step={0.01}
        />
      </Folder>
    </>
  );
};

export default Editor;
