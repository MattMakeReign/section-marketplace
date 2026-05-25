/**
 * KineticWordReveal — editor.tsx (custom controller).
 *
 * Word text is intentionally NOT exposed here — it's content data the designer
 * inline-edits on the canvas. The controller stays focused on layout / motion
 * / media per the standing rule.
 */

"use client";

import { useCallback } from "react";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  EditorRow,
  FillSlider, MediaManager, Segmented,
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
          <EditorRow label="Size">
            <FillSlider
              value={props.fontSizeVw}
              onChange={(v) => onChange({ fontSizeVw: v })}
              min={4}
              max={18}
              step={0.25}
              format={(v) => `${v.toFixed(2)}vw`}
            />
          </EditorRow>
          <EditorRow label="Weight">
            <Segmented<"500" | "700" | "800" | "900">
              ariaLabel="Font weight"
              value={String(props.fontWeight) as "500" | "700" | "800" | "900"}
              onChange={(v) => onChange({ fontWeight: Number(v) })}
              options={[
                { value: "500", label: "M" },
                { value: "700", label: "B" },
                { value: "800", label: "X" },
                { value: "900", label: "U" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Track">
            <FillSlider
              value={props.letterSpacingEm}
              onChange={(v) => onChange({ letterSpacingEm: v })}
              min={-0.08}
              max={0.08}
              step={0.005}
              format={(v) => `${v.toFixed(3)}em`}
            />
          </EditorRow>
          <EditorRow label="Tile">
            <FillSlider
              value={props.mediaWidthVw}
              onChange={(v) => onChange({ mediaWidthVw: v })}
              min={3}
              max={22}
              step={0.25}
              format={(v) => `${v.toFixed(2)}vw`}
            />
          </EditorRow>
          <EditorRow label="Shape">
            <Segmented<MediaAspect>
              ariaLabel="Media aspect ratio"
              value={props.mediaAspect}
              onChange={(v) => onChange({ mediaAspect: v })}
              options={[
                { value: "portrait", label: "4:5" },
                { value: "square", label: "1:1" },
                { value: "landscape", label: "4:3" },
                { value: "auto", label: "Auto" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider
              value={props.mediaRadiusVw}
              onChange={(v) => onChange({ mediaRadiusVw: v })}
              min={0}
              max={4}
              step={0.05}
              format={(v) => `${v.toFixed(2)}vw`}
            />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider
              value={props.mediaGapVw}
              onChange={(v) => onChange({ mediaGapVw: v })}
              min={0}
              max={6}
              step={0.1}
              format={(v) => `${v.toFixed(1)}vw`}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <AccordionTrigger>Motion</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Push">
            <FillSlider
              value={props.pushSeconds}
              onChange={(v) => onChange({ pushSeconds: v })}
              min={0.1}
              max={1.2}
              step={0.02}
              format={(v) => `${v.toFixed(2)}s`}
            />
          </EditorRow>
          <EditorRow label="Hold">
            <FillSlider
              value={props.holdSeconds}
              onChange={(v) => onChange({ holdSeconds: v })}
              min={0.4}
              max={4}
              step={0.05}
              format={(v) => `${v.toFixed(2)}s`}
            />
          </EditorRow>
          <EditorRow label="Tilt">
            <FillSlider
              value={props.tiltDeg}
              onChange={(v) => onChange({ tiltDeg: v })}
              min={0}
              max={45}
              step={1}
              format={(v) => `${Math.round(v)}°`}
            />
          </EditorRow>
          <EditorRow label="Pop">
            <FillSlider
              value={props.popScale}
              onChange={(v) => onChange({ popScale: v })}
              min={1}
              max={1.3}
              step={0.01}
              format={(v) => `×${v.toFixed(2)}`}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
