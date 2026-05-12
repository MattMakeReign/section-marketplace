/**
 * ai-draft-curation.ts — server-only Claude wiring for the curator's
 * "Draft with AI" affordance on the EnrichmentForm.
 *
 * Reads a section's source (index.tsx + README.md + section.json) plus its
 * captured preview PNG, sends them to Claude (Sonnet 4.6, vision-enabled)
 * with the curation vocabulary embedded in the prompt, returns a structured
 * draft of the curator-owned fields.
 *
 * Uses Claude's tool-use mechanism for schema-enforced output: we define a
 * single `submit_curation_draft` tool whose input schema mirrors `Curation +
 * ProseSections`, force the model to call it, and parse the structured args.
 *
 * Does NOT save anything — just drafts. The curator reviews the draft in the
 * EnrichmentForm and accepts / edits / rejects per field before saving via
 * the existing `PUT /api/sections/[id]/curation`.
 *
 * Cost ceiling: see `idea-api-security-cleanup` for the security-run plan
 * that adds per-call budgets + audit logging. For v1 we just emit the token
 * usage to the caller so the UI can show a "you spent $X" trailer.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  PAGE_TYPES,
  TONAL_AFFORDANCES,
  STRUCTURAL_SLOTS,
  VISUAL_DENSITIES,
  IMAGERY_DEPENDENCE,
  COPY_DENSITIES,
  README_PROSE_SECTIONS,
  type Curation,
  type ProseSections,
} from "@mr/section-library-ui";

const MODEL = "claude-sonnet-4-6";

export class AIDraftError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type DraftInput = {
  sectionId: string;
  sectionName: string;
  category: string;
  description: string;
  /** Raw `index.tsx` source. */
  source: string;
  /** Current README.md (may be empty / scaffold). */
  readme: string;
  /** Captured preview PNG bytes. Optional — drafts work source-only too. */
  previewPng?: Buffer;
};

export type DraftResult = {
  curation: Partial<Curation>;
  prose: ProseSections;
  modelUsed: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    /** Rough USD cost; based on Sonnet 4.6 published pricing. */
    estimatedCostUsd: number;
  };
};

/** Sonnet 4.6 pricing as of 2026-05 — input $3/MTok, output $15/MTok. */
function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
}

/**
 * The tool-use schema. Mirrors `Curation` (curation-vocab.ts) + the four
 * named `README_PROSE_SECTIONS` keys. Loose enums where the curator vocab
 * file declares the field as suggestion-only (multi-selects); strict enums
 * where the schema is closed (single-selects).
 */
function buildToolSchema() {
  const proseProps: Record<string, { type: "string"; description: string }> = {};
  for (const s of README_PROSE_SECTIONS) {
    proseProps[s.key] = {
      type: "string",
      description: `Markdown for the README "${s.heading}" section. ${s.help}`,
    };
  }
  return {
    name: "submit_curation_draft" as const,
    description:
      "Submit your structured draft of the curator-owned metadata for this section. " +
      "Fields describe the layout (not the brand) so an AI given a project brief can " +
      "pick or reject this section, then adapt it to the project's tokens.",
    input_schema: {
      type: "object" as const,
      properties: {
        curation: {
          type: "object",
          description: "Structured curator-owned metadata. All 8 required fields should be filled.",
          properties: {
            intent: {
              type: "string",
              description:
                "ONE LINE describing what the layout IS, structurally. Beyond `category`. " +
                "Example: 'Statement-piece hero with split layout — large headline left, structural image right.' " +
                "Brand-agnostic. No marketing language.",
            },
            structuralPattern: {
              type: "string",
              description:
                "Short layout shape descriptor. Examples: 'split-2col: text-left, image-right', " +
                "'edge-to-edge marquee', 'centered manifesto', '3-up card grid'.",
            },
            structuralSlots: {
              type: "array",
              items: { type: "string" },
              description:
                "Named content slots the layout exposes. Pick from this suggested list when applicable, " +
                `add ad-hoc slot names if the section needs them: ${STRUCTURAL_SLOTS.join(", ")}`,
            },
            pageTypes: {
              type: "array",
              items: { type: "string", enum: [...PAGE_TYPES] },
              description:
                `Page types where this layout naturally fits (multiple). Pick from: ${PAGE_TYPES.join(", ")}. ` +
                "Be honest — a hero won't fit on a blog-listing.",
            },
            tonalAffordances: {
              type: "array",
              items: { type: "string", enum: [...TONAL_AFFORDANCES] },
              description:
                `Tones the layout CAN credibly carry. Plural by intent — a layout that only carries ` +
                `one tone is over-specified. Pick from: ${TONAL_AFFORDANCES.join(", ")}.`,
            },
            visualDensity: {
              type: "string",
              enum: [...VISUAL_DENSITIES],
              description: "Overall visual density of the rendered section.",
            },
            imageryDependence: {
              type: "string",
              enum: [...IMAGERY_DEPENDENCE],
              description:
                "Does the layout REQUIRE imagery to work, treat it as optional, or use none?",
            },
            copyDensity: {
              type: "string",
              enum: [...COPY_DENSITIES],
              description: "How much copy the layout expects.",
            },
            composition: {
              type: "object",
              description:
                "Optional. Section IDs or category names this layout naturally pairs with above/below, " +
                "or anti-pairs with (don't put adjacent). Leave empty if unsure.",
              properties: {
                pairsAbove: { type: "array", items: { type: "string" } },
                pairsBelow: { type: "array", items: { type: "string" } },
                antiPairs: { type: "array", items: { type: "string" } },
              },
            },
          },
          required: [
            "intent",
            "structuralPattern",
            "structuralSlots",
            "pageTypes",
            "tonalAffordances",
            "visualDensity",
            "imageryDependence",
            "copyDensity",
          ],
        },
        prose: {
          type: "object",
          description:
            "Markdown for four named README sections. Each is what an AI consults when " +
            "deciding whether to pick this section for a brief, and how to adapt it.",
          properties: proseProps,
          required: README_PROSE_SECTIONS.map((s) => s.key),
        },
      },
      required: ["curation", "prose"],
    },
  };
}

const SYSTEM_PROMPT = `You are a curator assistant for a section-library system used by design studios. Your job: given a single section's source code, README, and a screenshot, draft the curator-owned metadata an AI would later consult to PICK this section for a project brief and ADAPT it to the project's tokens.

Be precise, brand-agnostic, and structural. Describe what the layout IS, not what it sells. Avoid marketing language. Avoid superlatives. Prefer concrete shape descriptors over vibes.

Pick honestly: tonalAffordances should be plural (3-5 is typical) but tight; structuralSlots should match what the JSX actually renders; pageTypes should reject contexts where the section would fail.

Prose sections are written for a future AI to consume:
- "When to use" — positive case, 2-4 bullets, structural reasons.
- "When NOT to use" — negative case, 2-4 bullets, equally important. Tells future AI when to reject.
- "Adaptation notes" — what should change per project (colour tokens, copy, image source) vs what is structural and should stay.
- "Failure modes" — known edge cases. e.g. "breaks past 8-word H1", "image must be ≥ 16:9".

You will call the submit_curation_draft tool with your structured output. Never reply with prose outside the tool call.`;

function buildUserMessage(input: DraftInput): string {
  const truncatedSource =
    input.source.length > 8000
      ? input.source.slice(0, 8000) + "\n\n... [truncated, source longer than 8000 chars]"
      : input.source;
  const truncatedReadme =
    input.readme.length > 4000
      ? input.readme.slice(0, 4000) + "\n\n... [truncated]"
      : input.readme;
  return `Section to curate:

ID: ${input.sectionId}
Name: ${input.sectionName}
Local category: ${input.category}
Description: ${input.description}

== index.tsx ==
\`\`\`tsx
${truncatedSource}
\`\`\`

== README.md ==
${truncatedReadme || "(empty / scaffold)"}

${input.previewPng ? "A screenshot of the rendered section is attached. Use it for visualDensity, imageryDependence, and tonalAffordances judgements." : "(no screenshot available — judge from source only)"}

Draft the curation metadata + four README prose sections. Submit via the submit_curation_draft tool.`;
}

export async function draftCuration(input: DraftInput): Promise<DraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    throw new AIDraftError(
      "key_not_configured",
      "ANTHROPIC_API_KEY is not set in repos/section-marketplace/.env.local — see tracker card task-ai-metadata-drafts.",
    );
  }

  const client = new Anthropic({ apiKey });
  const tool = buildToolSchema();

  const userText = buildUserMessage(input);
  const userContent: Anthropic.MessageParam["content"] =
    input.previewPng && input.previewPng.byteLength > 0
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: input.previewPng.toString("base64"),
            },
          },
          { type: "text", text: userText },
        ]
      : userText;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401) {
      throw new AIDraftError("invalid_key", "Anthropic rejected the API key — check repos/section-marketplace/.env.local.");
    }
    if (e.status === 429) {
      throw new AIDraftError("rate_limited", "Anthropic rate-limited the request — try again in a moment.");
    }
    throw new AIDraftError("api_call_failed", e.message ?? String(err));
  }

  // Pull the tool_use block out of the response. With tool_choice forced,
  // the model MUST emit one — but we still defend against malformed output.
  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) {
    throw new AIDraftError("no_tool_call", "Model did not return a structured draft (no tool_use block).");
  }

  const args = toolUse.input as { curation?: unknown; prose?: unknown };
  if (!args || typeof args !== "object" || !args.curation || !args.prose) {
    throw new AIDraftError("invalid_draft", "Model's tool call was missing curation or prose fields.");
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    curation: args.curation as Partial<Curation>,
    prose: args.prose as ProseSections,
    modelUsed: MODEL,
    tokenUsage: {
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCost(inputTokens, outputTokens),
    },
  };
}
