/**
 * StackingCards — editor.tsx (custom controller).
 *
 * Stripped from production / client-share builds — designer tooling only.
 *
 * Surface:
 *   • Media — MediaManager over the card backgrounds (add/multi/remove/reorder).
 *   • Cards — height (vh), corner radius, padding, gap between stacking cards.
 *   • Stack — base top offset, per-card stagger (the "how much each card
 *     overlaps the previous one" knob).
 *   • Tile — frosted-glass stat tile padding + radius, gradient overlay toggle.
 *   • Layout — headline alignment, headline-to-cards gap.
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
import type { StackingCard, StackingCardsProps } from "./StackingCards";

type EditorProps = Required<Pick<StackingCardsProps,
  | "cards" | "headlineAlign" | "cardHeightVh" | "cardRadiusPx" | "cardPaddingPx"
  | "baseTopPx" | "stickyStaggerPx" | "cardGapPx"
  | "tilePaddingPx" | "tileRadiusPx" | "headlineGapPx" | "showGradient" | "scaleStep"
  | "gridSpan"
>>;

const SECTION_ID = "stacking-cards";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.cards.map((c, i) => ({
    id: `${c.filename}-${i}`,
    src: c.image,
    filename: c.filename,
  }));

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextCards: StackingCard[] = await Promise.all(
        next.map(async (mi, i) => {
          const existing = props.cards.find(
            (c, idx) => `${c.filename}-${idx}` === mi.id,
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
              console.error("Stacking-card upload failed:", err);
            }
          }

          return {
            image: finalSrc,
            filename: finalFilename,
            alt: existing?.alt ?? finalFilename,
            stat: existing?.stat ?? "New",
            caption: existing?.caption ?? "",
          };
        }),
      );
      onChange({ cards: nextCards });
    },
    [props.cards, onChange, upload],
  );

  return (
    <Accordion type="multiple" defaultValue={["media", "cards", "stack"]}>
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
            <Segmented<"8" | "10" | "12">
              ariaLabel="Card width in grid columns"
              value={String(props.gridSpan) as "8" | "10" | "12"}
              onChange={(v) => onChange({ gridSpan: Number(v) as 8 | 10 | 12 })}
              options={[
                { value: "8", label: "8" },
                { value: "10", label: "10" },
                { value: "12", label: "12" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Height">
            <FillSlider value={props.cardHeightVh} onChange={(v) => onChange({ cardHeightVh: v })} min={40} max={100} step={1} format={(v) => `${Math.round(v)}vh`} />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider value={props.cardRadiusPx} onChange={(v) => onChange({ cardRadiusPx: v })} min={0} max={48} step={1} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Padding">
            <FillSlider value={props.cardPaddingPx} onChange={(v) => onChange({ cardPaddingPx: v })} min={8} max={64} step={2} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider value={props.cardGapPx} onChange={(v) => onChange({ cardGapPx: v })} min={0} max={64} step={2} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Gradient">
            <Toggle checked={props.showGradient} onChange={(v) => onChange({ showGradient: v })} ariaLabel="Bottom gradient" />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="stack">
        <AccordionTrigger>Stack</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Top">
            <FillSlider value={props.baseTopPx} onChange={(v) => onChange({ baseTopPx: v })} min={0} max={240} step={4} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Stagger">
            <FillSlider value={props.stickyStaggerPx} onChange={(v) => onChange({ stickyStaggerPx: v })} min={0} max={160} step={4} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Pushback">
            <FillSlider value={props.scaleStep} onChange={(v) => onChange({ scaleStep: v })} min={0} max={0.15} step={0.005} format={(v) => `${Math.round(v * 100)}%`} />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="tile">
        <AccordionTrigger>Tile</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Padding">
            <FillSlider value={props.tilePaddingPx} onChange={(v) => onChange({ tilePaddingPx: v })} min={8} max={48} step={2} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider value={props.tileRadiusPx} onChange={(v) => onChange({ tileRadiusPx: v })} min={0} max={24} step={1} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="layout">
        <AccordionTrigger>Layout</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Align">
            <Segmented<"left" | "center" | "right">
              ariaLabel="Headline alignment"
              value={props.headlineAlign}
              onChange={(v) => onChange({ headlineAlign: v })}
              options={[{ value: "left", label: "L" }, { value: "center", label: "C" }, { value: "right", label: "R" }]}
            />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider value={props.headlineGapPx} onChange={(v) => onChange({ headlineGapPx: v })} min={32} max={240} step={4} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
