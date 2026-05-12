/**
 * /review — Curator review queue.
 *
 * Server component that loads the manifest and shows every Submitted +
 * InReview section as a horizontal row with preview thumb, metadata, and a
 * completion meter for the AI-legibility schema. Click any row to land in
 * the per-section enrichment form at `/sections/[id]/edit`.
 *
 * Gated by `?mode=curate` like the rest of the curator surface — visitors
 * who land here without the flag get a polite redirect link back to home.
 */

import Link from "next/link";
import { loadManifest } from "../marketplace-data";
import {
  APPROVAL_REQUIRED_FIELDS,
  getLifecycle,
  lifecycleLabel,
  missingForApproval,
  type Curation,
  type Lifecycle,
} from "@mr/section-library-ui";

type SearchParams = Promise<{ mode?: string }>;

const QUEUE_STATES: Lifecycle[] = ["Submitted", "InReview"];

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24)));
}

function ageLabel(days: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { mode } = await searchParams;
  const curatorMode = mode === "curate";
  const manifest = await loadManifest();
  const queue = (manifest.sections ?? [])
    .filter((s) => QUEUE_STATES.includes(getLifecycle(s)))
    .sort((a, b) => (a.attribution?.submittedAt ?? "").localeCompare(b.attribution?.submittedAt ?? ""));

  if (!curatorMode) {
    return (
      <>
        <header className="mr-mk-topbar">
          <div className="mr-mk-topbar__brand">
            <span className="mr-mk-topbar__sub">MakeReign</span>
            <Link href="/" className="mr-mk-topbar__wordmark">Section Library</Link>
          </div>
        </header>
        <section className="mr-mk-header">
          <div className="mr-mk-header__eyebrow">Curator only</div>
          <h1 className="mr-mk-header__title">
            Review queue is <em>curator-only.</em>
          </h1>
          <p className="mr-mk-header__sub">
            Open this page with <code>?mode=curate</code> in the URL to access the curation surface.
            Visitors browse the catalogue from the <Link href="/">home page</Link>.
          </p>
        </section>
      </>
    );
  }

  const submittedCount = queue.filter((s) => getLifecycle(s) === "Submitted").length;
  const inReviewCount = queue.filter((s) => getLifecycle(s) === "InReview").length;

  return (
    <>
      <header className="mr-mk-topbar">
        <div className="mr-mk-topbar__brand">
          <span className="mr-mk-topbar__sub">MakeReign</span>
          <Link href={`/?mode=curate`} className="mr-mk-topbar__wordmark">Section Library</Link>
          <span className="mr-mk-curator-flag">Curator mode</span>
        </div>
        <nav className="mr-mk-topbar__nav">
          <Link href={`/?mode=curate`} className="mr-mk-topbar__navlink">Catalogue</Link>
          <Link href={`/review?mode=curate`} className="mr-mk-topbar__navlink mr-mk-topbar__navlink--active">Review queue</Link>
        </nav>
      </header>

      <section className="mr-mk-header">
        <div className="mr-mk-header__eyebrow">Sections / Review queue</div>
        <h1 className="mr-mk-header__title">
          Sections waiting <em>for curation.</em>
        </h1>
        <p className="mr-mk-header__sub">
          Submitted layouts haven&apos;t been enriched yet. Open one to fill in the metadata that lets an
          AI pick or reject it for a brief — structural pattern, slots, page-fit, tonal affordances.
        </p>
      </section>

      <div className="mr-mk-queue-summary">
        <span className="mr-sl-badge" data-lifecycle="Submitted">
          <span className="mr-sl-badge__dot" />
          {submittedCount} submitted
        </span>
        <span className="mr-sl-badge" data-lifecycle="InReview">
          <span className="mr-sl-badge__dot" />
          {inReviewCount} in review
        </span>
      </div>

      {queue.length === 0 ? (
        <div className="mr-mk-empty">
          <p>Queue is empty. Every section has been promoted or archived.</p>
        </div>
      ) : (
        <ol className="mr-mk-queue">
          {queue.map((s) => {
            const lifecycle = getLifecycle(s);
            const missing = missingForApproval(s.curation as Curation | undefined);
            const filled = APPROVAL_REQUIRED_FIELDS.length - missing.length;
            const pct = Math.round((filled / APPROVAL_REQUIRED_FIELDS.length) * 100);
            const age = ageLabel(daysSince(s.attribution?.submittedAt));
            return (
              <li key={s.id} className="mr-mk-queue__row">
                <Link href={`/sections/${s.id}/edit?mode=curate`} className="mr-mk-queue__link">
                  <div className="mr-mk-queue__thumb">
                    {s.previews?.static ? (
                      <img src={`/preview/${s.id}`} alt="" loading="lazy" />
                    ) : (
                      <span className="mr-mk-card__fallback">{s.id}</span>
                    )}
                  </div>
                  <div className="mr-mk-queue__main">
                    <div className="mr-mk-queue__title-row">
                      <span className="mr-mk-queue__name">{s.name}</span>
                      <span className="mr-sl-badge" data-lifecycle={lifecycle}>
                        <span className="mr-sl-badge__dot" />
                        {lifecycleLabel(lifecycle)}
                      </span>
                    </div>
                    {s.description ? (
                      <span className="mr-mk-queue__desc">{s.description}</span>
                    ) : null}
                    <div className="mr-mk-queue__meta">
                      <span>{s.category}</span>
                      <span>·</span>
                      <span>{s.submittedBy ?? "core"}</span>
                      <span>·</span>
                      <span>submitted {age}</span>
                    </div>
                  </div>
                  <div className="mr-mk-queue__progress">
                    <div className="mr-mk-queue__progress-label">
                      <span>Metadata</span>
                      <span className="mr-mk-queue__progress-num">{filled} / {APPROVAL_REQUIRED_FIELDS.length}</span>
                    </div>
                    <div className="mr-mk-queue__bar" aria-hidden>
                      <div className="mr-mk-queue__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="mr-mk-queue__cta">Open →</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
