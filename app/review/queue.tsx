"use client";

/**
 * <ReviewQueue /> — curator's pending-work surface.
 *
 * Rebuilt on @mr/tools-ui primitives (Card / Badge / Button / LifecycleBadge)
 * so the surface respects dark mode via --mr-* tokens directly. No
 * --chrome-* token consumption, no legacy mr-mk-* classes.
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
import {
  Button,
  Card,
  LifecycleBadge,
  type LifecycleName,
} from "@mr/tools-ui";
import { TopBar } from "../topbar";

const QUEUE_STATES: Lifecycle[] = ["Submitted"];

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
        const aT = a.attribution?.submittedAt ?? a.updated ?? "";
        const bT = b.attribution?.submittedAt ?? b.updated ?? "";
        return bT.localeCompare(aT);
      });
  }, [queue, search]);

  return (
    <>
      <TopBar sections={sections} search={{ value: search, onChange: setSearch }} />

      <main className="mr-review">
        <header className="mr-review__head">
          <h1 className="mr-review__title">Review queue</h1>
          <p className="mr-review__subtitle">
            {queue.length === 0
              ? "Nothing waiting. Every submitted section has been approved or archived."
              : `${queue.length} section${queue.length === 1 ? "" : "s"} awaiting approval.`}
          </p>
        </header>

        {filtered.length === 0 ? (
          <Card className="mr-review__empty">
            <div className="mr-review__empty-mark" aria-hidden>✓</div>
            <h2 className="mr-review__empty-title">Queue is clear</h2>
            <p className="mr-review__empty-text">
              {queue.length === 0
                ? "When designers submit sections from their projects, they land here for curation."
                : "No sections match the current filter."}
            </p>
            <Link href="/" className="mr-review__empty-link">View catalogue →</Link>
          </Card>
        ) : (
          <ul className="mr-review__list">
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
    <li>
      <Card className="mr-review-card">
        <Link
          href={`/sections/${section.id}?panel=info`}
          className="mr-review-card__media"
          aria-label={`Open ${section.name} for review`}
        >
          {section.previews?.static ? (
            <img
              className="mr-review-card__thumb"
              src={`/preview/${section.id}`}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className="mr-review-card__fallback">{section.id.slice(0, 2)}</span>
          )}
          {videoUrl ? (
            <video
              className="mr-review-card__video"
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

        <div className="mr-review-card__body">
          <header className="mr-review-card__head">
            <LifecycleBadge
              lifecycle={lifecycle as LifecycleName}
              label={lifecycleLabel(lifecycle)}
            />
            <span className="mr-review-card__age">
              {daysSince(section.attribution?.submittedAt ?? section.created)}
            </span>
          </header>

          <Link href={`/sections/${section.id}?panel=info`} className="mr-review-card__name">
            {section.name}
          </Link>

          {section.description ? (
            <p className="mr-review-card__desc">{section.description}</p>
          ) : (
            <p className="mr-review-card__desc mr-review-card__desc--empty">
              No description yet
            </p>
          )}

          {section.tags?.length ? (
            <div className="mr-review-card__tags">
              {section.tags.slice(0, 6).map((t) => (
                <span key={t} className="mr-review-card__tag">{t}</span>
              ))}
            </div>
          ) : null}

          {primary ? (
            <footer className="mr-review-card__actions">
              <Button
                variant="primary"
                shape="pill"
                onClick={() => runTransition(primary)}
                disabled={primaryDisabled}
                title={primaryTitle}
              >
                {pending ? "Working…" : primary.label}
              </Button>
            </footer>
          ) : null}

          {error ? <div className="mr-review-card__error">{error}</div> : null}
        </div>
      </Card>
    </li>
  );
}
