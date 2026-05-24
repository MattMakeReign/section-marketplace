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
import type { GalleryImage, HeroSplitGalleryProps } from "./index";

type EditorProps = Required<Pick<HeroSplitGalleryProps,
  | "leftImages" | "rightImages"
  | "headlineAlign" | "textCols" | "galleryDriftSpeed" | "imageRadiusPx">>;

const SECTION_ID = "hero-split-gallery";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  // Flatten both columns into a single Media list. On change we split back —
  // even indices into left column, odd into right.
  const flat = [...props.leftImages, ...props.rightImages];
  const items: MediaItem[] = flat.map((g, i) => ({
    id: `${g.filename}-${i}`,
    src: g.src,
    filename: g.filename,
  }));

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const resolved: GalleryImage[] = await Promise.all(
        next.map(async (mi, i) => {
          const existing = flat.find(
            (g, idx) => `${g.filename}-${idx}` === mi.id,
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
              console.error("Gallery upload failed:", err);
            }
          }

          return { src: finalSrc, filename: finalFilename, alt: existing?.alt ?? finalFilename };
        }),
      );
      // Alternate items into the two columns so reorders + adds spread evenly.
      const left: GalleryImage[] = [];
      const right: GalleryImage[] = [];
      resolved.forEach((g, i) => (i % 2 === 0 ? left : right).push(g));
      onChange({ leftImages: left, rightImages: right });
    },
    [flat, onChange, upload],
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
          <EditorRow label="Split">
            <Segmented<"4" | "5" | "6" | "7">
              ariaLabel="Text column width"
              value={String(props.textCols) as "4" | "5" | "6" | "7"}
              onChange={(v) => onChange({ textCols: Number(v) as 4 | 5 | 6 | 7 })}
              options={[
                { value: "4", label: "4/8" },
                { value: "5", label: "5/7" },
                { value: "6", label: "6/6" },
                { value: "7", label: "7/5" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Align">
            <Segmented<"left" | "center" | "right">
              ariaLabel="Headline alignment"
              value={props.headlineAlign}
              onChange={(v) => onChange({ headlineAlign: v })}
              options={[{ value: "left", label: "L" }, { value: "center", label: "C" }, { value: "right", label: "R" }]}
            />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider value={props.imageRadiusPx} onChange={(v) => onChange({ imageRadiusPx: v })} min={0} max={48} step={1} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="motion">
        <AccordionTrigger>Motion</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Drift">
            <FillSlider value={props.galleryDriftSpeed} onChange={(v) => onChange({ galleryDriftSpeed: v })} min={0} max={2} step={0.05} format={(v) => v.toFixed(2)} />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
