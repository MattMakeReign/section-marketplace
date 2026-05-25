/**
 * TeamGridDark — editor.tsx (custom controller).
 *
 * Travels with the section through every hop in the pipeline:
 *   project (here) → `mr submit` → marketplace bundle → `mr install` → next project.
 *
 * Stripped from production / client-export builds — designer tooling only.
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
import type { Member, PanelPosition, TeamGridDarkProps } from "./TeamGridDark";

type EditorProps = Required<Pick<TeamGridDarkProps,
  | "members" | "gridColumns" | "cardHeightPx" | "cardRadiusPx" | "cardGapPx"
  | "imageFit" | "showPanel" | "panelPosition"
  | "background" | "showHeadline" | "headlineAlign" | "staggerMs"
>>;

const SECTION_ID = "team-grid-dark";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Team member";
}

function memberToMediaItem(m: Member, i: number): MediaItem {
  return { id: `${m.filename}-${i}`, src: m.photo, filename: m.filename };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.members.map(memberToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextMembers: Member[] = await Promise.all(
        next.map(async (item, i) => {
          const existing = props.members.find(
            (m, idx) => `${m.filename}-${idx}` === item.id,
          );
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
            name: nameFromFilename(finalFilename),
            role: "",
            filename: finalFilename,
            photo: finalSrc,
            alt: nameFromFilename(finalFilename),
          };
        }),
      );
      onChange({ members: nextMembers });
    },
    [props.members, onChange, upload],
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
            <Segmented<"2" | "3" | "4" | "6">
              ariaLabel="Desktop column count"
              value={String(props.gridColumns) as "2" | "3" | "4" | "6"}
              onChange={(v) => onChange({ gridColumns: Number(v) as 2 | 3 | 4 | 6 })}
              options={[
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "6", label: "6" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Height">
            <FillSlider
              value={props.cardHeightPx}
              onChange={(v) => onChange({ cardHeightPx: v })}
              min={160}
              max={640}
              step={4}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider
              value={props.cardRadiusPx}
              onChange={(v) => onChange({ cardRadiusPx: v })}
              min={0}
              max={48}
              step={1}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider
              value={props.cardGapPx}
              onChange={(v) => onChange({ cardGapPx: v })}
              min={0}
              max={48}
              step={1}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Fit">
            <Segmented<"cover" | "contain">
              ariaLabel="Image fit"
              value={props.imageFit}
              onChange={(v) => onChange({ imageFit: v })}
              options={[
                { value: "cover", label: "Cover" },
                { value: "contain", label: "Fit" },
              ]}
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
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="panel">
        <AccordionTrigger>Caption</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Show">
            <Toggle
              checked={props.showPanel}
              onChange={(v) => onChange({ showPanel: v })}
              ariaLabel="Show name/role panel"
            />
          </EditorRow>
          <EditorRow label="Corner">
            <Segmented<PanelPosition>
              ariaLabel="Panel corner"
              value={props.panelPosition}
              onChange={(v) => onChange({ panelPosition: v })}
              options={[
                { value: "top-left", label: "↖" },
                { value: "top-right", label: "↗" },
                { value: "bottom-left", label: "↙" },
                { value: "bottom-right", label: "↘" },
              ]}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="headline">
        <AccordionTrigger>Headline</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Show">
            <Toggle
              checked={props.showHeadline}
              onChange={(v) => onChange({ showHeadline: v })}
              ariaLabel="Show headline"
            />
          </EditorRow>
          <EditorRow label="Align">
            <Segmented<"left" | "center" | "right">
              ariaLabel="Headline alignment"
              value={props.headlineAlign}
              onChange={(v) => onChange({ headlineAlign: v })}
              options={[
                { value: "left", label: "L" },
                { value: "center", label: "C" },
                { value: "right", label: "R" },
              ]}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <AccordionTrigger>Motion</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Stagger">
            <FillSlider
              value={props.staggerMs}
              onChange={(v) => onChange({ staggerMs: v })}
              min={0}
              max={400}
              step={10}
              format={(v) => `${Math.round(v)}ms`}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
