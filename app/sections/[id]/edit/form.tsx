"use client";

/**
 * <EnrichmentForm /> — the client side of the curator enrichment editor.
 *
 * Two-column layout: form fields on the left (structured curator-owned
 * metadata + named README prose), sticky preview + completion meter +
 * save controls on the right.
 *
 * All saves go through `PUT /api/sections/[id]/curation` which writes
 * section.json + named README sections + patches the in-memory index.json.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  APPROVAL_REQUIRED_FIELDS,
  COPY_DENSITIES,
  IMAGERY_DEPENDENCE,
  PAGE_TYPES,
  README_PROSE_SECTIONS,
  STRUCTURAL_SLOTS,
  TONAL_AFFORDANCES,
  VISUAL_DENSITIES,
  getLifecycle,
  lifecycleLabel,
  missingForApproval,
  type Curation,
  type ManifestEntry,
  type ProseSections,
  type ReadmeProseKey,
} from "@mr/section-library-ui";
import {
  CANONICAL_CATEGORIES,
  isCanonicalCategory,
  suggestCanonical,
} from "@/lib/canonical-categories";

/* ─────────────────────────── Chip controls ─────────────────────────── */

function SingleSelectChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
}) {
  return (
    <div className="mr-mk-chips">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            className={`mr-mk-chip${active ? " mr-mk-chip--active" : ""}`}
            aria-pressed={active}
            onClick={() => onChange(active ? undefined : opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MultiSelectChips({
  suggested,
  value,
  onChange,
  allowCustom = true,
  placeholder = "Add custom…",
}: {
  suggested: readonly string[];
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const set = useMemo(() => new Set(value ?? []), [value]);
  const knownChips = useMemo(() => {
    // Union of suggested + already-set values (so a curator-added custom
    // value persists as an interactive chip even after save reload).
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of suggested) if (!seen.has(s)) { seen.add(s); list.push(s); }
    for (const v of value ?? []) if (!seen.has(v)) { seen.add(v); list.push(v); }
    return list;
  }, [suggested, value]);

  function toggle(opt: string) {
    const next = new Set(set);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(Array.from(next));
  }

  function addDraft() {
    const v = draft.trim();
    if (!v) return;
    if (!set.has(v)) onChange([...(value ?? []), v]);
    setDraft("");
  }

  return (
    <div className="mr-mk-chips">
      {knownChips.map((opt) => {
        const active = set.has(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`mr-mk-chip${active ? " mr-mk-chip--active" : ""}`}
            aria-pressed={active}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        );
      })}
      {allowCustom ? (
        <input
          type="text"
          className="mr-mk-chip-input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addDraft(); }
          }}
          onBlur={() => { if (draft.trim()) addDraft(); }}
        />
      ) : null}
    </div>
  );
}

/* ─────────────────────────── Field row ─────────────────────────── */

function Field({
  label,
  hint,
  required,
  filled,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mr-mk-field">
      <div className="mr-mk-field__head">
        <span className="mr-mk-field__label">
          {label}
          {required ? (
            <span
              className={`mr-mk-field__required${filled ? " mr-mk-field__required--filled" : ""}`}
              aria-label={filled ? "required, filled" : "required"}
              title={filled ? "required · filled" : "required"}
            >●</span>
          ) : null}
        </span>
        {hint ? <span className="mr-mk-field__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────── Form ─────────────────────────── */

export function EnrichmentForm({
  section,
  initialProse,
}: {
  section: ManifestEntry;
  initialProse: ProseSections;
}) {
  const router = useRouter();
  const [curation, setCuration] = useState<Curation>(section.curation ?? {});
  const [prose, setProse] = useState<ProseSections>(initialProse);
  const [categoryDraft, setCategoryDraft] = useState<string>(section.category ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // AI draft state. `drafting` is the in-flight flag; `draftMeta` holds the
  // cost trailer + drafted-at marker once the call returns. `draftError`
  // surfaces failures from the new POST /api/sections/[id]/draft-curation
  // endpoint without crashing the form.
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftMeta, setDraftMeta] = useState<{
    modelUsed: string;
    tokenUsage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
    at: number;
  } | null>(null);

  const lifecycle = getLifecycle(section);
  const missing = useMemo(() => missingForApproval(curation), [curation]);
  const total = APPROVAL_REQUIRED_FIELDS.length;
  const filled = total - missing.length;
  const pct = Math.round((filled / total) * 100);

  function patch<K extends keyof Curation>(key: K, value: Curation[K]) {
    setCuration((c) => ({ ...c, [key]: value }));
  }
  function patchComposition<K extends keyof NonNullable<Curation["composition"]>>(
    key: K,
    value: NonNullable<Curation["composition"]>[K],
  ) {
    setCuration((c) => ({ ...c, composition: { ...(c.composition ?? {}), [key]: value } }));
  }
  function patchProse(key: ReadmeProseKey, value: string) {
    setProse((p) => ({ ...p, [key]: value }));
  }

  /**
   * "Draft with AI" — POSTs to /api/sections/[id]/draft-curation, gets a
   * structured Partial<Curation> + ProseSections back from Claude, applies
   * them into form state. Curator can then edit anything they don't like
   * before clicking Save.
   *
   * The draft NEVER auto-saves. The existing Save button is the commit point.
   */
  async function draftWithAI() {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch(`/api/sections/${section.id}/draft-curation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as
        | {
            ok: true;
            curation: Partial<Curation>;
            prose: ProseSections;
            modelUsed: string;
            tokenUsage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
          }
        | { ok: false; error: string; code: string };
      if (!res.ok || !json.ok) {
        throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
      }
      // Merge: AI-proposed fields fill gaps + replace stale values. Curator
      // edits afterwards win because they happen in form state on top of this.
      setCuration((c) => ({
        ...c,
        ...json.curation,
        composition: {
          ...(c.composition ?? {}),
          ...(json.curation.composition ?? {}),
        },
      }));
      setProse((p) => ({ ...p, ...json.prose }));
      setDraftMeta({
        modelUsed: json.modelUsed,
        tokenUsage: json.tokenUsage,
        at: Date.now(),
      });
    } catch (e) {
      setDraftError((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sections/${section.id}/curation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curation,
          prose,
          // Category override — sent only when the curator picked something
          // different from the submitted free-form value. Server validates
          // against the canonical 16 before writing.
          ...(categoryDraft !== (section.category ?? "") ? { category: categoryDraft } : {}),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; section: ManifestEntry }
        | { ok: false; error: string; code: string };
      if (!res.ok || !json.ok) {
        throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function isRequiredFilled(key: keyof Curation): boolean {
    return !missing.includes(key as string);
  }

  return (
    <div className="mr-mk-edit">
      {/* ───── Header ───── */}
      <section className="mr-mk-edit__head">
        <Link href="/review?mode=curate" className="mr-mk-edit__back">← Back to queue</Link>
        <div className="mr-mk-edit__title-row">
          <h1 className="mr-mk-edit__title">{section.name}</h1>
          <span className="mr-sl-badge" data-lifecycle={lifecycle}>
            <span className="mr-sl-badge__dot" />
            {lifecycleLabel(lifecycle)}
          </span>
        </div>
        <p className="mr-mk-edit__sub">{section.description}</p>

        {/* AI draft affordance. Submits the section's source + README +
            preview to Claude, gets back a structured draft of the 8 required
            curation fields + 4 prose sections, applies them into form state.
            Curator can edit anything afterwards — Save is still the commit. */}
        <div className="mr-mk-edit__ai">
          <button
            type="button"
            className="mr-mk-edit__ai-button"
            onClick={draftWithAI}
            disabled={drafting}
            aria-busy={drafting}
          >
            {drafting ? "Drafting with AI…" : "Draft with AI"}
          </button>
          <span className="mr-mk-edit__ai-hint">
            {drafting
              ? "Reading source, README, and preview · this takes a few seconds."
              : draftMeta
                ? `Drafted ${new Date(draftMeta.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${draftMeta.tokenUsage.inputTokens.toLocaleString()} in / ${draftMeta.tokenUsage.outputTokens.toLocaleString()} out · ~$${draftMeta.tokenUsage.estimatedCostUsd.toFixed(3)} · ${draftMeta.modelUsed}`
                : "Claude proposes all 8 fields + the four README prose sections. Review, edit, save."}
          </span>
          {draftError ? (
            <span className="mr-mk-edit__ai-error" role="alert">
              {draftError}
            </span>
          ) : null}
        </div>
      </section>

      <div className="mr-mk-edit__body">
        {/* ───── Left: form ───── */}
        <form
          className="mr-mk-edit__form"
          onSubmit={(e) => { e.preventDefault(); save(); }}
        >
          <fieldset className="mr-mk-edit__group">
            <legend>Library placement — which bucket this lives in</legend>

            <Field
              label="Category"
              hint={
                isCanonicalCategory(categoryDraft)
                  ? "Canonical Library category. Drives the filter rail."
                  : `Designer submitted '${categoryDraft || "(empty)"}'${
                      suggestCanonical(categoryDraft)
                        ? ` — suggestion: ${suggestCanonical(categoryDraft)}`
                        : ""
                    }. Pick one of the 16 canonical buckets.`
              }
              required
              filled={isCanonicalCategory(categoryDraft)}
            >
              <select
                className="mr-mk-input"
                value={isCanonicalCategory(categoryDraft) ? categoryDraft : ""}
                onChange={(e) => setCategoryDraft(e.target.value)}
              >
                <option value="" disabled>
                  Choose a canonical category…
                </option>
                <optgroup label="Page sections">
                  {CANONICAL_CATEGORIES.filter((c) => c.kind === "page").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} — {c.hint}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Persistence sections (global chrome)">
                  {CANONICAL_CATEGORIES.filter((c) => c.kind === "persistence").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} — {c.hint}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
          </fieldset>

          <fieldset className="mr-mk-edit__group">
            <legend>Structural — what the layout IS</legend>

            <Field
              label="Intent"
              hint="One line, structural. e.g. 'Statement-piece hero with split layout — large headline left, structural image right.'"
              required
              filled={isRequiredFilled("intent")}
            >
              <input
                type="text"
                className="mr-mk-input"
                value={curation.intent ?? ""}
                onChange={(e) => patch("intent", e.target.value)}
                placeholder="Layout-first description (no brand assumptions)…"
              />
            </Field>

            <Field
              label="Structural pattern"
              hint="Short shape descriptor. e.g. 'split-2col: text-left, image-right'."
              required
              filled={isRequiredFilled("structuralPattern")}
            >
              <input
                type="text"
                className="mr-mk-input"
                value={curation.structuralPattern ?? ""}
                onChange={(e) => patch("structuralPattern", e.target.value)}
                placeholder="layout shape…"
              />
            </Field>

            <Field
              label="Structural slots"
              hint="The named content slots the layout exposes."
              required
              filled={isRequiredFilled("structuralSlots")}
            >
              <MultiSelectChips
                suggested={STRUCTURAL_SLOTS}
                value={curation.structuralSlots}
                onChange={(v) => patch("structuralSlots", v)}
              />
            </Field>
          </fieldset>

          <fieldset className="mr-mk-edit__group">
            <legend>Page-fit — where it goes</legend>

            <Field
              label="Page types"
              hint="Where the layout naturally fits."
              required
              filled={isRequiredFilled("pageTypes")}
            >
              <MultiSelectChips
                suggested={PAGE_TYPES}
                value={curation.pageTypes}
                onChange={(v) => patch("pageTypes", v)}
              />
            </Field>

            <Field
              label="Tonal affordances"
              hint="Tones the layout CAN credibly carry (plural). Not 'is' — 'can'."
              required
              filled={isRequiredFilled("tonalAffordances")}
            >
              <MultiSelectChips
                suggested={TONAL_AFFORDANCES}
                value={curation.tonalAffordances}
                onChange={(v) => patch("tonalAffordances", v)}
              />
            </Field>
          </fieldset>

          <fieldset className="mr-mk-edit__group">
            <legend>Visual character</legend>

            <Field label="Visual density" required filled={isRequiredFilled("visualDensity")}>
              <SingleSelectChips
                options={VISUAL_DENSITIES}
                value={curation.visualDensity}
                onChange={(v) => patch("visualDensity", v)}
              />
            </Field>

            <Field label="Imagery dependence" required filled={isRequiredFilled("imageryDependence")}>
              <SingleSelectChips
                options={IMAGERY_DEPENDENCE}
                value={curation.imageryDependence}
                onChange={(v) => patch("imageryDependence", v)}
              />
            </Field>

            <Field label="Copy density" required filled={isRequiredFilled("copyDensity")}>
              <SingleSelectChips
                options={COPY_DENSITIES}
                value={curation.copyDensity}
                onChange={(v) => patch("copyDensity", v)}
              />
            </Field>
          </fieldset>

          <fieldset className="mr-mk-edit__group">
            <legend>Composition — what it plays well with</legend>

            <Field label="Pairs above" hint="Section IDs or categories that naturally sit above this.">
              <MultiSelectChips
                suggested={[]}
                value={curation.composition?.pairsAbove}
                onChange={(v) => patchComposition("pairsAbove", v)}
                placeholder="add section id or category…"
              />
            </Field>
            <Field label="Pairs below" hint="Section IDs or categories that naturally sit below this.">
              <MultiSelectChips
                suggested={[]}
                value={curation.composition?.pairsBelow}
                onChange={(v) => patchComposition("pairsBelow", v)}
                placeholder="add section id or category…"
              />
            </Field>
            <Field label="Anti-pairs" hint="NOT to put adjacent. e.g. two heroes in a row.">
              <MultiSelectChips
                suggested={[]}
                value={curation.composition?.antiPairs}
                onChange={(v) => patchComposition("antiPairs", v)}
                placeholder="add section id, category, or pattern…"
              />
            </Field>
          </fieldset>

          <fieldset className="mr-mk-edit__group">
            <legend>Prose context — written for AI</legend>
            {README_PROSE_SECTIONS.map((s) => (
              <Field key={s.key} label={s.heading} hint={s.help}>
                <textarea
                  className="mr-mk-textarea"
                  rows={5}
                  value={prose[s.key as ReadmeProseKey] ?? ""}
                  onChange={(e) => patchProse(s.key as ReadmeProseKey, e.target.value)}
                  placeholder={`Markdown — bullets, short prose. Saved into README.md under "## ${s.heading}".`}
                />
              </Field>
            ))}
          </fieldset>
        </form>

        {/* ───── Right: sticky sidebar ───── */}
        <aside className="mr-mk-edit__side">
          <div className="mr-mk-edit__preview">
            {section.previews?.static ? (
              <img src={`/preview/${section.id}`} alt={`${section.name} preview`} />
            ) : (
              <span className="mr-mk-card__fallback">{section.id}</span>
            )}
          </div>

          <div className="mr-mk-edit__meter">
            <div className="mr-mk-edit__meter-head">
              <span className="mr-mk-edit__meter-label">Approval readiness</span>
              <span className="mr-mk-edit__meter-num">{filled} / {total}</span>
            </div>
            <div className="mr-mk-edit__meter-bar" aria-hidden>
              <div className="mr-mk-edit__meter-fill" style={{ width: `${pct}%` }} />
            </div>
            {missing.length > 0 ? (
              <ul className="mr-mk-edit__meter-missing">
                {missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            ) : (
              <p className="mr-mk-edit__meter-done">All required fields filled — ready for Approve.</p>
            )}
          </div>

          <div className="mr-mk-edit__actions">
            <button
              type="button"
              className="mr-mk-cta"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : savedAt && Date.now() - savedAt < 2500 ? "Saved" : "Save curation"}
            </button>
            <Link href="/review?mode=curate" className="mr-mk-cta mr-mk-cta--ghost">
              Done
            </Link>
            {error ? <span className="mr-mk-edit__error" role="alert">{error}</span> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
