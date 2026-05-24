/**
 * PricingThreeTier — editor.tsx (custom controller).
 *
 * Travels with the section through every hop in the pipeline:
 *   project (here) → `mr submit` → marketplace bundle → `mr install` → next project.
 *
 * Stripped from production / client-export builds — designer tooling only.
 *
 * Surface: structural knobs only. Tier copy is content territory (AI handles
 * it); this panel doesn't try to edit prices or feature lists.
 */

"use client";

import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  EditorRow,
  FillSlider, Segmented, Toggle,
  type SectionEditor,
} from "@mr/section-editors";
import type { PricingThreeTierProps } from "./PricingThreeTier";

type EditorProps = Required<Pick<PricingThreeTierProps,
  | "tierCount" | "featuredIndex"
  | "cardPaddingPx" | "cardRadiusPx" | "cardGapPx"
  | "showEyebrowTab" | "showDivider"
  | "showHeadline" | "headlineAlign"
  | "showAvatarBar">>;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  return (
    <Accordion type="multiple" defaultValue={["layout", "cards"]}>
      <AccordionItem value="layout">
        <AccordionTrigger>Layout</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Tiers">
            <FillSlider
              value={props.tierCount}
              onChange={(v) => onChange({ tierCount: v })}
              min={0}
              max={3}
              step={1}
            />
          </EditorRow>
          <EditorRow label="Featured">
            <Segmented<"0" | "1" | "2">
              ariaLabel="Featured tier index"
              value={String(props.featuredIndex) as "0" | "1" | "2"}
              onChange={(v) => onChange({ featuredIndex: Number(v) as 0 | 1 | 2 })}
              options={[
                { value: "0", label: "1st" },
                { value: "1", label: "2nd" },
                { value: "2", label: "3rd" },
              ]}
            />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider
              value={props.cardGapPx}
              onChange={(v) => onChange({ cardGapPx: v })}
              min={0}
              max={64}
              step={2}
              format={(v) => `${Math.round(v)}px`}
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cards">
        <AccordionTrigger>Cards</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Padding">
            <FillSlider
              value={props.cardPaddingPx}
              onChange={(v) => onChange({ cardPaddingPx: v })}
              min={12}
              max={64}
              step={2}
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
          <EditorRow label="Divider">
            <Toggle
              checked={props.showDivider}
              onChange={(v) => onChange({ showDivider: v })}
              ariaLabel="Show divider"
            />
          </EditorRow>
          <EditorRow label="Eyebrow">
            <Toggle
              checked={props.showEyebrowTab}
              onChange={(v) => onChange({ showEyebrowTab: v })}
              ariaLabel="Show eyebrow tab"
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

      <AccordionItem value="guidance">
        <AccordionTrigger>Guidance</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Show">
            <Toggle
              checked={props.showAvatarBar}
              onChange={(v) => onChange({ showAvatarBar: v })}
              ariaLabel="Show guidance bar"
            />
          </EditorRow>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default Editor;
