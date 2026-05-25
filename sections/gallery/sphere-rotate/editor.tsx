/**
 * SphereRotate — editor.tsx (custom controller).
 *
 * Designer-controllable surface for the mwg_099 reference. Per the standing
 * controller rules (layout / motion / media — never per-text toggles), every
 * accordion exposes a structural or motion knob a designer would otherwise
 * have to edit code to change.
 */

"use client";

import { useCallback } from "react";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  EditorRow,
  FillSlider, MediaManager, Segmented, Toggle,
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
    <Accordion type="multiple" defaultValue={["media", "layout", "motion"]}>
      <AccordionItem value="media">
        <AccordionTrigger>Media</AccordionTrigger>
        <AccordionContent>
          <MediaManager items={items} onChange={handleMediaChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="layout">
        <AccordionTrigger>Layout</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Height">
            <FillSlider
              value={props.heightVh}
              onChange={(v) => onChange({ heightVh: v })}
              min={50}
              max={120}
              step={1}
              format={(v) => `${Math.round(v)}vh`}
            />
          </EditorRow>
          <EditorRow label="Tone">
            <Segmented<"dark" | "light">
              ariaLabel="Background tone"
              value={props.background}
              onChange={(v) => onChange({ background: v })}
              options={[
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Tile">
            <FillSlider
              value={props.imageSizeVw}
              onChange={(v) => onChange({ imageSizeVw: v })}
              min={4}
              max={20}
              step={0.5}
              format={(v) => `${v.toFixed(1)}vw`}
            />
          </EditorRow>
          <EditorRow label="Mobile">
            <FillSlider
              value={props.imageSizeVwMobile}
              onChange={(v) => onChange({ imageSizeVwMobile: v })}
              min={6}
              max={26}
              step={0.5}
              format={(v) => `${v.toFixed(1)}vw`}
            />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider
              value={props.imageRadiusPx}
              onChange={(v) => onChange({ imageRadiusPx: v })}
              min={0}
              max={48}
              step={1}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Sphere">
            <FillSlider
              value={props.sphereRadiusFactor}
              onChange={(v) => onChange({ sphereRadiusFactor: v })}
              min={0.1}
              max={0.45}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </EditorRow>
          <EditorRow label="Depth">
            <FillSlider
              value={props.perspectiveVw}
              onChange={(v) => onChange({ perspectiveVw: v })}
              min={40}
              max={120}
              step={1}
              format={(v) => `${Math.round(v)}vw`}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <AccordionTrigger>Motion</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Inertia">
            <FillSlider
              value={props.inertiaSeconds}
              onChange={(v) => onChange({ inertiaSeconds: v })}
              min={0.2}
              max={2.5}
              step={0.05}
              format={(v) => `${v.toFixed(2)}s`}
            />
          </EditorRow>
          <EditorRow label="Drag">
            <FillSlider
              value={props.dragSensitivity}
              onChange={(v) => onChange({ dragSensitivity: v })}
              min={1}
              max={12}
              step={0.5}
              format={(v) => `${v.toFixed(1)}`}
            />
          </EditorRow>
          <EditorRow label="Wheel">
            <Toggle
              checked={props.wheelEnabled}
              onChange={(v) => onChange({ wheelEnabled: v })}
              ariaLabel="Wheel rotates sphere (locks page scroll while inside section)"
            />
          </EditorRow>
          <EditorRow label="Sense">
            <FillSlider
              value={props.wheelSensitivity}
              onChange={(v) => onChange({ wheelSensitivity: v })}
              min={2}
              max={30}
              step={0.5}
              format={(v) => `${v.toFixed(1)}`}
            />
          </EditorRow>
          <EditorRow label="Spin">
            <Toggle
              checked={props.autoSpin}
              onChange={(v) => onChange({ autoSpin: v })}
              ariaLabel="Auto-spin when idle"
            />
          </EditorRow>
          <EditorRow label="Speed">
            <FillSlider
              value={props.autoSpinSpeed}
              onChange={(v) => onChange({ autoSpinSpeed: v })}
              min={2}
              max={60}
              step={1}
              format={(v) => `${Math.round(v)}°/s`}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
