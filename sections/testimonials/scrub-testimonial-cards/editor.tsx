/**
 * ScrubTestimonialCards — editor.tsx (dialkit).
 *
 * Avatar-only Media (MediaManager rows map 1:1 to testimonials by id —
 * replacing an avatar keeps the testimonial's quote/name/role; reordering
 * reorders testimonials; adding a row creates a placeholder testimonial that
 * the designer can fill via chat; removing a row drops the matching
 * testimonial entirely).
 *
 * Layout / Palette / Motion folders expose the structural levers a designer
 * would otherwise have to edit code to change.
 */

"use client";

import { useCallback } from "react";
import { Folder, Slider, SelectControl, ColorControl } from "dialkit";
import "dialkit/styles.css";
import {
  MediaManager,
  type MediaItem,
  type SectionEditor,
} from "@mr/section-editors";
import { useAssetUpload } from "@/components/use-asset-upload";
import type { TestimonialCard, ScrubTestimonialCardsProps } from "./ScrubTestimonialCards";

type EditorProps = Required<Pick<ScrubTestimonialCardsProps,
  | "items"
  | "background"
  | "cardWidthPx"
  | "cardWidthVwMobile"
  | "cardAspectRatio"
  | "cardRadiusPx"
  | "cardGapPx"
  | "cardPaddingPx"
  | "quoteFontSizePx"
  | "palette"
  | "lagMultiplier"
  | "lagDurationSec"
>>;

const SECTION_ID = "scrub-testimonial-cards";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

function testimonialToMediaItem(t: TestimonialCard): MediaItem {
  return { id: t.id, src: t.avatar.src, filename: t.avatar.filename ?? t.id };
}

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const mediaItems: MediaItem[] = props.items.map(testimonialToMediaItem);

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextItems: TestimonialCard[] = await Promise.all(
        next.map(async (item) => {
          const existing = props.items.find((t) => t.id === item.id);
          // Upload any new blob.
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
          if (existing) {
            // Preserve text fields; only swap avatar.
            return {
              ...existing,
              avatar: { src: finalSrc, filename: finalFilename },
            };
          }
          // New row: placeholder testimonial that the designer can fill via chat.
          return {
            id: item.id,
            quote: "New testimonial — edit this quote via chat.",
            name: "Name",
            role: "Role",
            avatar: { src: finalSrc, filename: finalFilename },
          };
        }),
      );
      onChange({ items: nextItems });
    },
    [props.items, onChange, upload],
  );

  const setPaletteAt = useCallback(
    (i: number) => (color: string) => {
      const next = [...props.palette] as [string, string, string, string];
      next[i] = color;
      onChange({ palette: next });
    },
    [props.palette, onChange],
  );

  return (
    <>
      <Folder title="Media" defaultOpen={false}>
        <MediaManager items={mediaItems} onChange={handleMediaChange} />
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
          value={props.cardWidthPx}
          onChange={(cardWidthPx) => onChange({ cardWidthPx })}
          min={240}
          max={520}
          step={5}
          unit="px"
        />
        <Slider
          label="Aspect"
          value={props.cardAspectRatio}
          onChange={(cardAspectRatio) => onChange({ cardAspectRatio })}
          min={0.5}
          max={1.4}
          step={0.05}
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
          label="Gap"
          value={props.cardGapPx}
          onChange={(cardGapPx) => onChange({ cardGapPx })}
          min={0}
          max={80}
          step={1}
          unit="px"
        />
        <Slider
          label="Pad"
          value={props.cardPaddingPx}
          onChange={(cardPaddingPx) => onChange({ cardPaddingPx })}
          min={16}
          max={64}
          step={1}
          unit="px"
        />
        <Slider
          label="Quote"
          value={props.quoteFontSizePx}
          onChange={(quoteFontSizePx) => onChange({ quoteFontSizePx })}
          min={16}
          max={44}
          step={1}
          unit="px"
        />
        <Slider
          label="Mobile"
          value={props.cardWidthVwMobile}
          onChange={(cardWidthVwMobile) => onChange({ cardWidthVwMobile })}
          min={50}
          max={90}
          step={1}
          unit="vw"
        />
      </Folder>

      <Folder title="Palette" defaultOpen={false}>
        <ColorControl label="01" value={props.palette[0]} onChange={setPaletteAt(0)} />
        <ColorControl label="02" value={props.palette[1]} onChange={setPaletteAt(1)} />
        <ColorControl label="03" value={props.palette[2]} onChange={setPaletteAt(2)} />
        <ColorControl label="04" value={props.palette[3]} onChange={setPaletteAt(3)} />
      </Folder>

      <Folder title="Motion" defaultOpen>
        <Slider
          label="Lag"
          value={props.lagMultiplier}
          onChange={(lagMultiplier) => onChange({ lagMultiplier })}
          min={0}
          max={8}
          step={0.25}
          shortcut={{ key: "l", mode: "fine", interaction: "scroll" }}
        />
        <Slider
          label="Speed"
          value={props.lagDurationSec}
          onChange={(lagDurationSec) => onChange({ lagDurationSec })}
          min={0.2}
          max={1.5}
          step={0.05}
          unit="s"
          shortcut={{ key: "s", mode: "fine", interaction: "scroll" }}
        />
      </Folder>
    </>
  );
};

export default Editor;
