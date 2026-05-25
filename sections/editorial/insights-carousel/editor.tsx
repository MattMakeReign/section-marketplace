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
import type { InsightsCarouselProps, Slide } from "./InsightsCarousel";

type EditorProps = Required<Pick<InsightsCarouselProps,
  | "slides" | "headlineAlign" | "cardWidthPx" | "cardRadiusPx" | "cardGapPx">>;

const SECTION_ID = "insights-carousel";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.slides.map((s, i) => ({
    id: `${s.filename}-${i}`,
    src: s.image,
    filename: s.filename,
  }));

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextSlides: Slide[] = await Promise.all(
        next.map(async (mi, i) => {
          const existing = props.slides.find(
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
              console.error("Slide upload failed:", err);
            }
          }

          return {
            image: finalSrc,
            filename: finalFilename,
            alt: existing?.alt ?? finalFilename,
            title: existing?.title ?? "New insight",
            body: existing?.body ?? "",
          };
        }),
      );
      onChange({ slides: nextSlides });
    },
    [props.slides, onChange, upload],
  );

  return (
    <Accordion type="multiple" defaultValue={["media", "cards"]}>
      <AccordionItem value="media">
        <AccordionTrigger>Media</AccordionTrigger>
        <AccordionContent>
          <MediaManager items={items} onChange={handleMediaChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cards">
        <AccordionTrigger>Cards</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Width">
            <FillSlider value={props.cardWidthPx} onChange={(v) => onChange({ cardWidthPx: v })} min={280} max={760} step={4} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider value={props.cardRadiusPx} onChange={(v) => onChange({ cardRadiusPx: v })} min={0} max={32} step={1} format={(v) => `${Math.round(v)}px`} />
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
    </Accordion>
  );
};

export default Editor;
