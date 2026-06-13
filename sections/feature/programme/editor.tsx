"use client";

/**
 * Programme — editor.tsx (dialkit).
 *
 * Layout + Motion knobs only. Copy (eyebrow/heading/items) is CMS-owned
 * via the `programmeContent` Sanity document — never exposed here, per the
 * controller rule.
 */

import { Folder, Slider } from "dialkit";
import "dialkit/styles.css";
import type { SectionEditor } from "@mr/section-editors";
import type { ProgrammeProps } from "./index";

type EditorProps = Required<
  Pick<ProgrammeProps, "imageHeightVh" | "parallaxPx" | "revealStaggerMs">
>;

const Editor: SectionEditor<EditorProps> = ({ props, onChange }) => {
  return (
    <>
      <Folder title="Layout" defaultOpen>
        <Slider
          label="Image height"
          value={props.imageHeightVh}
          min={32}
          max={72}
          step={1}
          unit="vh"
          onChange={(v: number) => onChange({ imageHeightVh: v })}
        />
      </Folder>
      <Folder title="Motion">
        <Slider
          label="Parallax"
          value={props.parallaxPx}
          min={0}
          max={120}
          step={4}
          unit="px"
          shortcut={{ key: "p", mode: "fine", interaction: "scroll" }}
          onChange={(v: number) => onChange({ parallaxPx: v })}
        />
        <Slider
          label="Stagger"
          value={props.revealStaggerMs}
          min={0}
          max={300}
          step={10}
          unit="ms"
          shortcut={{ key: "s", mode: "fine", interaction: "scroll" }}
          onChange={(v: number) => onChange({ revealStaggerMs: v })}
        />
      </Folder>
    </>
  );
};

export default Editor;
