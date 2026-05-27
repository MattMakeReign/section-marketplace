/**
 * SphereRotate — editor.tsx (real dialkit).
 *
 * First section converted to use dialkit's actual components:
 *   - <Folder> for the Media / Layout / Motion sections
 *   - <Slider> for every numeric knob (unit + shortcut built in)
 *   - <Toggle> for the booleans
 *   - <SelectControl> for the Dark/Light enum
 *
 * MediaManager stays from @mr/section-editors — dialkit has no upload primitive
 * and the asset-upload + sample.json flow is project-specific.
 *
 * Shortcut config: { key: "d", mode: "fine" } — hold the letter and scroll/drag
 * the slider for ×10 finer adjustment (dialkit's built-in behaviour).
 *
 * The SectionEditorMount wraps the output in .dialkit-root + .dialkit-panel-inner
 * so the controls render with dialkit's dark glassmorphic chrome.
 */

"use client";

import { useCallback } from "react";
import { Folder, Slider, Toggle, SelectControl } from "dialkit";
import "dialkit/styles.css";
import {
  MediaManager,
  type MediaItem,
  type SectionEditor,
} from "@mr/section-editors";
import { useAssetUpload } from "@/components/use-asset-upload";
import type { SphereItem, SphereRotateProps } from "./SphereRotate";

type EditorProps = Required<Pick<SphereRotateProps,
  | "items" | "heightVh" | "background"
  | "imageSizeVw" | "imageSizeVwMobile" | "imageRadiusPx"
  | "sphereRadiusFactor" | "perspectiveVw"
  | "inertiaSeconds" | "dragSensitivity"
  | "wheelEnabled" | "wheelSensitivity"
  | "autoSpin" | "autoSpinSpeed"
>>;

const SECTION_ID = "sphere-rotate";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: SphereItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: SphereItem[] = await Promise.all(
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
          label="Tile"
          value={props.imageSizeVw}
          onChange={(imageSizeVw) => onChange({ imageSizeVw })}
          min={4}
          max={20}
          step={0.5}
          unit="vw"
        />
        <Slider
          label="Mobile"
          value={props.imageSizeVwMobile}
          onChange={(imageSizeVwMobile) => onChange({ imageSizeVwMobile })}
          min={6}
          max={26}
          step={0.5}
          unit="vw"
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
          label="Sphere"
          value={props.sphereRadiusFactor}
          onChange={(sphereRadiusFactor) => onChange({ sphereRadiusFactor })}
          min={0.1}
          max={0.45}
          step={0.01}
        />
        <Slider
          label="Depth"
          value={props.perspectiveVw}
          onChange={(perspectiveVw) => onChange({ perspectiveVw })}
          min={40}
          max={120}
          step={1}
          unit="vw"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Inertia"
          value={props.inertiaSeconds}
          onChange={(inertiaSeconds) => onChange({ inertiaSeconds })}
          min={0.2}
          max={2.5}
          step={0.05}
          unit="s"
          shortcut={{ key: "i", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Drag"
          value={props.dragSensitivity}
          onChange={(dragSensitivity) => onChange({ dragSensitivity })}
          min={1}
          max={12}
          step={0.5}
          shortcut={{ key: "d", mode: "fine", interaction: "scroll" }}
        />
        <Toggle
          label="Wheel"
          checked={props.wheelEnabled}
          onChange={(wheelEnabled) => onChange({ wheelEnabled })}
        />
        <Slider
          label="Sense"
          value={props.wheelSensitivity}
          onChange={(wheelSensitivity) => onChange({ wheelSensitivity })}
          min={2}
          max={30}
          step={0.5}
          shortcut={{ key: "s", mode: "fine", interaction: "scroll" }}
        />
        <Toggle
          label="Spin"
          checked={props.autoSpin}
          onChange={(autoSpin) => onChange({ autoSpin })}
        />
        <Slider
          label="Speed"
          value={props.autoSpinSpeed}
          onChange={(autoSpinSpeed) => onChange({ autoSpinSpeed })}
          min={2}
          max={60}
          step={1}
          unit="°/s"
          shortcut={{ key: "a", mode: "fine", interaction: "scroll" }}
        />
      </Folder>
    </>
  );
};

export default Editor;
