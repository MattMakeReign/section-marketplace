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
import type { BlogListRowsProps, Post } from "./BlogListRows";

type EditorProps = Required<Pick<BlogListRowsProps,
  | "posts" | "headlineAlign" | "rowLimit" | "rowGapPx" | "imageRadiusPx">>;

const SECTION_ID = "blog-list-rows";
const ASSETS_DIR = `sections/${SECTION_ID}/assets`;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  const upload = useAssetUpload();
  const items: MediaItem[] = props.posts.map((p, i) => ({
    id: `${p.filename}-${i}`,
    src: p.image,
    filename: p.filename,
  }));

  const handleMediaChange = useCallback(
    async (next: MediaItem[]) => {
      const nextPosts: Post[] = await Promise.all(
        next.map(async (mi, i) => {
          const existing = props.posts.find(
            (p, idx) => `${p.filename}-${idx}` === mi.id,
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
              console.error("Post upload failed:", err);
            }
          }

          return {
            image: finalSrc,
            filename: finalFilename,
            alt: existing?.alt ?? finalFilename,
            title: existing?.title ?? "New post",
            category: existing?.category ?? "Insights",
            date: existing?.date ?? "",
            excerpt: existing?.excerpt ?? "",
            href: existing?.href ?? "#",
          };
        }),
      );
      onChange({ posts: nextPosts });
    },
    [props.posts, onChange, upload],
  );

  return (
    <Accordion type="multiple" defaultValue={["media", "rows"]}>
      <AccordionItem value="media">
        <AccordionTrigger>Media</AccordionTrigger>
        <AccordionContent>
          <MediaManager items={items} onChange={handleMediaChange} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="rows">
        <AccordionTrigger>Rows</AccordionTrigger>
        <AccordionContent>
          <EditorRow label="Count">
            <FillSlider value={props.rowLimit} onChange={(v) => onChange({ rowLimit: v })} min={1} max={20} step={1} />
          </EditorRow>
          <EditorRow label="Gap">
            <FillSlider value={props.rowGapPx} onChange={(v) => onChange({ rowGapPx: v })} min={8} max={64} step={2} format={(v) => `${Math.round(v)}px`} />
          </EditorRow>
          <EditorRow label="Radius">
            <FillSlider value={props.imageRadiusPx} onChange={(v) => onChange({ imageRadiusPx: v })} min={0} max={32} step={1} format={(v) => `${Math.round(v)}px`} />
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
