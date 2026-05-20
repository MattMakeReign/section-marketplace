"use client";

/**
 * <ReviewQueue /> — curator's pending-work surface.
 *
 * Three lifecycle states make up the queue:
 *   - Submitted: just arrived, awaiting first look
 *   - InReview: someone has touched it, work in progress
 *   - Approved: metadata ready, awaiting Promote click
 *
 * Each card shows the preview (PNG, video on hover if present), name, slim
 * metadata + an inline primary action — the next forward transition. Click
 * the card body to jump into the full detail page for deeper editing.
 *
 * Empty state when no sections are pending. Filter pills let the curator
 * narrow by lifecycle.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  APPROVAL_FIELD_LABELS,
  getLifecycle,
  lifecycleLabel,
  missingForApproval,
  transitionsFrom,
  type Lifecycle,
  type ManifestEntry,
  type Transition,
} from "@mr/section-library-ui";
import { TopBar } from "../topbar";

/**
 * The single queue state. After the 2026-05-19 lifecycle collapse, sections
 * are either Submitted (waiting on a curator), Approved (live), or Archived.
 * Only Submitted needs a queue — Approved and Archived are terminal-ish.
 */
const QUEUE_STATES: Lifecycle[] = ["Submitted"];

/** Heuristic for the "primary" action on each card — the next forward step. */
function primaryTransition(state: Lifecycle): Transition | null {
  const ts = transitionsFrom(state);
  return ts.find((t) => t.kind === "forward") ?? null;
}

function daysSince(iso: string | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.max(0, Math.round((Date.now() - then) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function ReviewQueue({ sections }: { sections: ManifestEntry[] }) {
  const queue = useMemo(
    () => sections.filter((s) => QUEUE_STATES.includes(getLifecycle(s))),
    [sections],
  );

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue
      .filter((s) => {
        if (!q) return true;
        const hay = [
          s.id, s.name, s.description ?? "", s.category,
          ...(s.tags ?? []),
        ].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        // Newer at the top — submittedAt as the primary key, updated as fallback.
        const aT = a.attribution?.submittedAt ?? a.updated ?? "";
        const bT = b.attribution?.submittedAt ?? b.updated ?? "";
        return bT.localeCompare(aT);
      });
  }, [queue, search]);

  return (
    <>
      <TopBar sections={sections} search={{ value: search, onChange: setSearch }} />

      <main className="mr-mk-review">
        <header className="mr-mk-review__head">
          <div>
            <h1 className="mr-mk-review__title">Review queue</h1>
            <p className="mr-mk-review__subtitle">
              {queue.length === 0
                ? "Nothing waiting. Every submitted section has been approved or archived."
                : `${queue.length} section${queue.length === 1 ? "" : "s"} awaiting approval.`}
            </p>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="mr-mk-review__empty">
            <div className="mr-mk-review__empty-mark" aria-hidden>✓</div>
            <h2>Queue is clear</h2>
            <p>
              {queue.length === 0
                ? "When designers submit sections from their projects, they land here for curation."
                : "No sections match the current filter."}
            </p>
            <Link href="/" className="mr-mk-review__empty-back">View catalogue →</Link>
          </div>
        ) : (
          <ul className="mr-mk-review__list">
            {filtered.map((s) => <ReviewCard key={s.id} section={s} />)}
          </ul>
        )}
      </main>
    </>
  );
}

/* ─────────────────────────── ReviewCard ─────────────────────────── */

function ReviewCard({ section }: { section: ManifestEntry }) {
  const router = useRouter();
  const lifecycle = getLifecycle(section);
  const primary = primaryTransition(lifecycle);
  const videoUrl = section.previews?.video;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server-side approve gate predicate. Surfaces as tooltip text on the
  // disabled button so the curator knows exactly what's missing.
  const missing = lifecycle === "InReview" ? missingForApproval(section) : [];
  const approveBlocked = lifecycle === "InReview" && missing.length > 0;

  async function runTransition(t: Transition) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/sections/${section.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: t.to }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Action failed");
        setPending(false);
        return;
      }
      // Refresh the server-rendered queue so the moved card disappears or
      // its lifecycle pill updates.
      router.refresh();
    } catch (e) {
      setError((e as Error).message ?? "Network error");
    } finally {
      setPending(false);
    }
  }

  const primaryDisabled = pending || (primary?.to === "Approved" && approveBlocked);
  const primaryTitle = primaryDisabled && approveBlocked
    ? "Missing: " + missing.map((m) => APPROVAL_FIELD_LABELS[m]).join(", ")
    : primary?.hint;

  return (
    <li className="mr-mk-review-card" data-lifecycle={lifecycle}>
      <Link
        href={`/sections/${section.id}?panel=info`}
        className="mr-mk-review-card__media"
        aria-label={`Open ${section.name} for review`}
      >
        {section.previews?.static ? (
          <img
            className="mr-mk-review-card__thumb"
            src={`/preview/${section.id}`}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="mr-mk-review-card__fallback">{section.id.slice(0, 2)}</span>
        )}
        {videoUrl ? (
          <video
            className="mr-mk-review-card__video"
            src={videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            aria-hidden
          />
        ) : null}
      </Link>

      <div className="mr-mk-review-card__body">
        <header className="mr-mk-review-card__head">
          <span className="mr-sl-badge" data-lifecycle={lifecycle}>
            <span className="mr-sl-badge__dot" />
            {lifecycleLabel(lifecycle)}
          </span>
          <span className="mr-mk-review-card__age">
            {daysSince(section.attribution?.submittedAt ?? section.created)}
          </span>
        </header>

        <Link href={`/sections/${section.id}?panel=info`} className="mr-mk-review-card__name">
          {section.name}
        </Link>

        {section.description ? (
          <p className="mr-mk-review-card__desc">{section.description}</p>
        ) : (
          <p className="mr-mk-review-card__desc mr-mk-review-card__desc--empty">
            No description yet
          </p>
        )}

        {section.tags?.length ? (
          <div className="mr-mk-review-card__tags">
            {section.tags.slice(0, 6).map((t) => (
              <span key={t} className="mr-mk-review-card__tag">{t}</span>
            ))}
          </div>
        ) : null}

        {primary ? (
          <footer className="mr-mk-review-card__actions">
            <button
              type="button"
              className="mr-mk-review-card__btn mr-mk-review-card__btn--primary"
              onClick={() => runTransition(primary)}
              disabled={primaryDisabled}
              title={primaryTitle}
            >
              {pending ? "Working…" : primary.label}
            </button>
          </footer>
        ) : null}

        {error ? <div className="mr-mk-review-card__error">{error}</div> : null}
      </div>
    </li>
  );
}
