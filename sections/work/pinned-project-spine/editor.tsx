/**
 * PinnedProjectSpine — editor.tsx (dialkit).
 *
 * MediaManager rows map 1:1 to projects by id — replacing a media keeps the
 * project's label/year; reordering reorders projects; adding a row creates
 * a placeholder project (label "New Project", year "—") for chat-editing;
 * removing a row drops the project.
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
import type { SpineProject, PinnedProjectSpineProps } from "./PinnedProjectSpine";

type EditorProps = Required<Pick<PinnedProjectSpineProps,
  | "items"
  | "background"
  | "pinLengthVh"
  | "inactiveWidthVw"
  | "labelFontSizeVw"
  | "labelLineHeightVw"
  | "imageMarginLeftVw"
  | "imageMarginRightVw"
  | "imageRadiusVw"
  | "dividerOpacity"
>>;

const SECTION_ID = "pinned-project-spine";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function projectToMediaItem(p: SpineProject): MediaItem {
  return { id: p.id, src: p.media.src, filename: p.media.filename ?? p.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const mediaItems: MediaItem[] = props.items.map(projectToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: SpineProject[] = await Promise.all(
        next.map(async (item) => {
          const existing = props.items.find((p) => p.id === item.id);
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
          if (existing) {
            return {
              ...existing,
              media: { src: finalSrc, filename: finalFilename },
            };
          }
          return {
            id: item.id,
            label: "New Project",
            year: "—",
            media: { src: finalSrc, filename: finalFilename },
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
        <MediaManager items={mediaItems} onChange={handleMediaChange} />
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
          label="Spine"
          value={props.inactiveWidthVw}
          onChange={(inactiveWidthVw) => onChange({ inactiveWidthVw })}
          min={2}
          max={10}
          step={0.25}
          unit="vw"
        />
        <Slider
          label="Label"
          value={props.labelFontSizeVw}
          onChange={(labelFontSizeVw) => onChange({ labelFontSizeVw })}
          min={1}
          max={3.5}
          step={0.1}
          unit="vw"
        />
        <Slider
          label="Line"
          value={props.labelLineHeightVw}
          onChange={(labelLineHeightVw) => onChange({ labelLineHeightVw })}
          min={1.5}
          max={4.5}
          step={0.1}
          unit="vw"
        />
        <Slider
          label="Gap"
          value={props.imageMarginLeftVw}
          onChange={(imageMarginLeftVw) => onChange({ imageMarginLeftVw })}
          min={2}
          max={12}
          step={0.25}
          unit="vw"
        />
        <Slider
          label="Right"
          value={props.imageMarginRightVw}
          onChange={(imageMarginRightVw) => onChange({ imageMarginRightVw })}
          min={0}
          max={4}
          step={0.1}
          unit="vw"
        />
        <Slider
          label="Radius"
          value={props.imageRadiusVw}
          onChange={(imageRadiusVw) => onChange({ imageRadiusVw })}
          min={0}
          max={2.5}
          step={0.05}
          unit="vw"
        />
        <Slider
          label="Divider"
          value={props.dividerOpacity}
          onChange={(dividerOpacity) => onChange({ dividerOpacity })}
          min={0}
          max={1}
          step={0.05}
        />
      </Folder>
    </>
  );
};

export default Editor;
