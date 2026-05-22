"use client";

import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  EditorRow,
  FillSlider, Segmented,
  type SectionEditor,
} from "@mr/section-editors";
import type { CtaBandProps } from "./CtaBand";

type EditorProps = Required<Pick<CtaBandProps,
  | "background" | "paddingScale" | "headlineAlign"
  | "stackOnDesktop" | "gapPx" | "ctaVariant" | "ctaSize">>;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => (
  <Accordion type="multiple" defaultValue={["layout", "cta"]}>
    <AccordionItem value="layout">
      <AccordionTrigger>Layout</AccordionTrigger>
      <AccordionContent>
        <EditorRow label="Tone">
          <Segmented<"dark" | "light" | "accent">
            ariaLabel="Background tone"
            value={props.background}
            onChange={(v) => onChange({ background: v })}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "accent", label: "Accent" },
            ]}
          />
        </EditorRow>
        <EditorRow label="Padding">
          <Segmented<"sm" | "md" | "lg" | "xl">
            ariaLabel="Padding scale"
            value={props.paddingScale}
            onChange={(v) => onChange({ paddingScale: v })}
            options={[
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
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
        <EditorRow label="Gap">
          <FillSlider
            value={props.gapPx}
            onChange={(v) => onChange({ gapPx: v })}
            min={8}
            max={96}
            step={2}
            format={(v) => `${Math.round(v)}px`}
          />
        </EditorRow>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="cta">
      <AccordionTrigger>CTA</AccordionTrigger>
      <AccordionContent>
        <EditorRow label="Style">
          <Segmented<"accent" | "outline" | "ghost">
            ariaLabel="CTA style"
            value={props.ctaVariant}
            onChange={(v) => onChange({ ctaVariant: v })}
            options={[
              { value: "accent", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "ghost", label: "Ghost" },
            ]}
          />
        </EditorRow>
        <EditorRow label="Size">
          <Segmented<"sm" | "md" | "lg">
            ariaLabel="CTA size"
            value={props.ctaSize}
            onChange={(v) => onChange({ ctaSize: v })}
            options={[
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
            ]}
          />
        </EditorRow>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default Editor;
