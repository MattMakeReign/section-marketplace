/**
 * DriftingCards — editor.tsx (dialkit).
 *
 * Layout: card width, gap, radius, edge padding, tone, headline size.
 * Motion: drift amplitude, scale peak, rotation jitter.
 *
 * Per the controllers rule, no Show/Hide toggles for text. Headline +
 * subhead are component props, edited via chat / code, not the panel.
 */

"use client";

import { useCallback } from "react";
import { Folder, Slider, SelectControl } from "dialkit";
import "dialkit/styles.css";
import {
  MediaManager,
  type MediaItem,
  type SectionEditor,
} from "@mr/section-editors";
import { useAssetUpload } from "@/components/use-asset-upload";
import type { DriftingCardItem, DriftingCardsProps } from "./DriftingCards";

type EditorProps = Required<Pick<DriftingCardsProps,
  | "items"
  | "headline"
  | "subhead"
  | "cardWidthVw"
  | "cardWidthVwMobile"
  | "cardGapVw"
  | "cardRadiusPx"
  | "edgePaddingVw"
  | "background"
  | "headlineSizeVh"
  | "driftAmplitude"
  | "driftAmplitudeMobile"
  | "scalePeak"
  | "rotationJitterDeg"
>>;

const SECTION_ID = "drifting-cards";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function itemToMediaItem(it: DriftingCardItem): MediaItem {
  return { id: it.id, src: it.src, filename: it.filename ?? it.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.items.map(itemToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: DriftingCardItem[] = await Promise.all(
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
    <>
      <Folder title="Media" defaultOpen={false}>
        <MediaManager items={items} onChange={handleMediaChange} />
      </Folder>

      <Folder title="Layout" defaultOpen>
        <SelectControl
          label="Tone"
          value={props.background}
          onChange={(v) => onChange({ background: v as "dark" | "light" })}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
        <Slider
          label="Width"
          value={props.cardWidthVw}
          onChange={(cardWidthVw) => onChange({ cardWidthVw })}
          min={6}
          max={24}
          step={0.5}
          unit="vw"
          shortcut={{ key: "w", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Gap"
          value={props.cardGapVw}
          onChange={(cardGapVw) => onChange({ cardGapVw })}
          min={0}
          max={6}
          step={0.25}
          unit="vw"
        />
        <Slider
          label="Radius"
          value={props.cardRadiusPx}
          onChange={(cardRadiusPx) => onChange({ cardRadiusPx })}
          min={0}
          max={48}
          step={1}
          unit="px"
        />
        <Slider
          label="Edge"
          value={props.edgePaddingVw}
          onChange={(edgePaddingVw) => onChange({ edgePaddingVw })}
          min={20}
          max={150}
          step={5}
          unit="vw"
        />
        <Slider
          label="Title"
          value={props.headlineSizeVh}
          onChange={(headlineSizeVh) => onChange({ headlineSizeVh })}
          min={2}
          max={12}
          step={0.5}
          unit="vh"
        />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Drift"
          value={props.driftAmplitude}
          onChange={(driftAmplitude) => onChange({ driftAmplitude })}
          min={0.1}
          max={0.8}
          step={0.02}
          shortcut={{ key: "d", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Pulse"
          value={props.scalePeak}
          onChange={(scalePeak) => onChange({ scalePeak })}
          min={1}
          max={2.2}
          step={0.05}
          shortcut={{ key: "p", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Jitter"
          value={props.rotationJitterDeg}
          onChange={(rotationJitterDeg) => onChange({ rotationJitterDeg })}
          min={0}
          max={12}
          step={0.5}
          unit="px"
        />
      </Folder>
    </>
  );
};

export default Editor;
