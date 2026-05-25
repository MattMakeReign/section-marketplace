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
import type { ProcessStepsPortraitsProps, Step } from "./ProcessStepsPortraits";

type EditorProps = Required<Pick<ProcessStepsPortraitsProps,
  | "steps" | "headlineAlign" | "columns" | "cardHeightPx" | "cardRadiusPx"
  | "cardGapPx" | "staggerMs" | "washStrength">>;

const SECTION_ID = "process-steps-portraits";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.steps.map((s, i) => ({
    id: `${s.filename}-${i}`,
    src: s.photo,
    filename: s.filename,
  }));

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextSteps: Step[] = await Promise.all(
        next.map(async (mi, i) => {
          const existing = props.steps.find(
            (s, idx) => `${s.filename}-${idx}` === mi.id,
          );
          if (existing && !mi.src.startsWith("blob:")) return existing;

          let finalSrc = mi.src;
          let finalFilename = mi.filename;
          if (mi.src.startsWith("blob:")) {
            try {
              const blob = await fetch(mi.src).then((r) => r.blob());
              const clean = mi.filename.replace(/[^\w.\-]/g, "_");
              await upload(`${ASSETS_DIR}/${clean}`, blob);
              finalFilename = clean;
              finalSrc = `/api/section-asset/${SECTION_ID}/${clean}?v=${Date.now()}`;
            } catch (err) {
              console.error("Step upload failed:", err);
            }
          }

          return {
            number: String(i + 1).padStart(2, "0"),
            title: existing?.title ?? "New step",
            body: existing?.body ?? "",
            photo: finalSrc,
            filename: finalFilename,
            alt: existing?.alt ?? finalFilename,
            variant: (i % 3) as 0 | 1 | 2,
          };
        }),
      );
      onChange({ steps: nextSteps });
    },
    [props.steps, onChange, upload],
  );

  return (
    <Accordion type="multiple" defaultValue={["media", "layout"]}>
      <AccordionItem value="media">
        <AccordionTrigger>Media</AccordionTrigger>
        <AccordionContent>
          <MediaManager items={items} onChange={handleMediaChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="layout">
        <AccordionTrigger>Layout</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Columns">
            <Segmented<"1" | "2" | "3">
              ariaLabel="Column count"
              value={String(props.columns) as "1" | "2" | "3"}
              onChange={(v) => onChange({ columns: Number(v) as 1 | 2 | 3 })}
              options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }]}
            />
          </EditorRow>
          <EditorRow label="Height">
            <FillSlider value={props.cardHeightPx} onChange={(v) => onChange({ cardHeightPx: v })} min={280} max={720} step={4} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider value={props.cardRadiusPx} onChange={(v) => onChange({ cardRadiusPx: v })} min={0} max={48} step={1} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider value={props.cardGapPx} onChange={(v) => onChange({ cardGapPx: v })} min={0} max={48} step={1} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Align">
            <Segmented<"left" | "center" | "right">
              ariaLabel="Headline alignment"
              value={props.headlineAlign}
              onChange={(v) => onChange({ headlineAlign: v })}
              options={[{ value: "left", label: "L" }, { value: "center", label: "C" }, { value: "right", label: "R" }]}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <AccordionTrigger>Motion</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Wash">
            <FillSlider value={props.washStrength} onChange={(v) => onChange({ washStrength: v })} min={0} max={100} step={1} format={(v) => `${Math.round(v)}%`} />
          </EditorRow>
          <EditorRow label="Stagger">
            <FillSlider value={props.staggerMs} onChange={(v) => onChange({ staggerMs: v })} min={0} max={400} step={10} format={(v) => `${Math.round(v)}ms`} />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
