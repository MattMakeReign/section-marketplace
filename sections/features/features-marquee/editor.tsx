/**
 * FeaturesMarquee — editor.tsx (custom controller).
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
import type { FeaturesMarqueeItem, FeaturesMarqueeProps } from "./index";

type EditorProps = Required<Pick<FeaturesMarqueeProps,
  | "items" | "direction" | "durationSeconds"
  | "cardWidthPx" | "cardHeightPx" | "cardRadiusPx" | "cardGapPx"
  | "parallaxPx" | "pauseOnHover"
  | "showHeader" | "showLabels" | "headerAlign"
>>;

const SECTION_ID = "features-marquee";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function filenameFromSrc(src: string, fallback: string): string {
  if (!src) return fallback;
  const last = src.split("?")[0].split("/").pop() ?? "";
  return last || fallback;
}

function itemToMediaItem(item: FeaturesMarqueeItem, i: number): MediaItem {
  const filename = item.filename ?? filenameFromSrc(item.src, `marquee-${i + 1}.jpg`);
  return { id: `${filename}-${i}`, src: item.src, filename };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const mediaItems: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: FeaturesMarqueeItem[] = await Promise.all(
        next.map(async (mi, i) => {
          const existing = props.items.find((it, idx) => {
            const filename = it.filename ?? filenameFromSrc(it.src, `marquee-${idx + 1}.jpg`);
            return `${filename}-${idx}` === mi.id;
          });
          if (existing && !mi.src.startsWith("blob:")) return existing;

          let finalSrc = mi.src;
          let finalFilename = mi.filename;
          if (mi.src.startsWith("blob:")) {
            try {
              const blob = await fetch(mi.src).then((r) => r.blob());
              const cleanName = mi.filename.replace(/[^\w.\-]/g, "_");
              await upload(`${ASSETS_DIR}/${cleanName}`, blob);
              finalFilename = cleanName;
              finalSrc = `/api/section-asset/${SECTION_ID}/${cleanName}?v=${Date.now()}`;
            } catch (err) {
              console.error("Marquee asset upload failed:", err);
            }
          }

          return { src: finalSrc, alt: "", labels: [], filename: finalFilename };
        }),
      );
      onChange({ items: nextItems });
    },
    [props.items, onChange, upload],
  );

  return (
    <Accordion type="multiple" defaultValue={["media", "cards", "motion"]}>
      <AccordionItem value="media">
        <AccordionTrigger>Media</AccordionTrigger>
        <AccordionContent>
          <MediaManager items={mediaItems} onChange={handleMediaChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cards">
        <AccordionTrigger>Cards</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Width">
            <FillSlider
              value={props.cardWidthPx}
              onChange={(v) => onChange({ cardWidthPx: v })}
              min={200}
              max={900}
              step={4}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Height">
            <FillSlider
              value={props.cardHeightPx}
              onChange={(v) => onChange({ cardHeightPx: v })}
              min={200}
              max={900}
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
              max={64}
              step={1}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Labels">
            <Toggle
              checked={props.showLabels}
              onChange={(v) => onChange({ showLabels: v })}
              ariaLabel="Show labels"
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <AccordionTrigger>Motion</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Direction">
            <Segmented<"left" | "right">
              ariaLabel="Marquee direction"
              value={props.direction}
              onChange={(v) => onChange({ direction: v })}
              options={[
                { value: "left", label: "←" },
                { value: "right", label: "→" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Speed">
            <FillSlider
              value={props.durationSeconds}
              onChange={(v) => onChange({ durationSeconds: v })}
              min={8}
              max={120}
              step={1}
              format={(v) => `${Math.round(v)}s`}
            />
          </EditorRow>
          <EditorRow label="Parallax">
            <FillSlider
              value={props.parallaxPx}
              onChange={(v) => onChange({ parallaxPx: v })}
              min={0}
              max={200}
              step={2}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
          <EditorRow label="Pause">
            <Toggle
              checked={props.pauseOnHover}
              onChange={(v) => onChange({ pauseOnHover: v })}
              ariaLabel="Pause on hover"
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="header">
        <AccordionTrigger>Header</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Show">
            <Toggle
              checked={props.showHeader}
              onChange={(v) => onChange({ showHeader: v })}
              ariaLabel="Show header"
            />
          </EditorRow>
          <EditorRow label="Align">
            <Segmented<"left" | "center" | "right">
              ariaLabel="Header alignment"
              value={props.headerAlign}
              onChange={(v) => onChange({ headerAlign: v })}
              options={[
                { value: "left", label: "L" },
                { value: "center", label: "C" },
                { value: "right", label: "R" },
              ]}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
