"use client";

/**
 * <TopBar /> — shared marketplace shell.
 *
 * Used by the catalogue (/) and the section detail page (/sections/[id]) so
 * the notification bell, profile menu, bookmarks, help, and primary nav stay
 * consistent across every route. Search is optional — gallery passes a
 * controlled query, other pages omit it.
 *
 * The right-side chrome (bell + profile) was previously inline in gallery.tsx;
 * it lives here now so the review queue inherits it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  type ManifestEntry, type Lifecycle,
  getLifecycle, lifecycleLabel,
} from "@mr/section-library-ui";

export function TopBar({
  sections,
  search,
}: {
  sections: ManifestEntry[];
  search?: { value: string; onChange: (v: string) => void };
}) {
  return (
    <header className="mr-sl-topbar">
      <div className="mr-sl-topbar__left">
        <Link
          href="/"
          className="mr-sl-topbar__logo"
          aria-label="MakeReign Section Library"
        >
          <span aria-hidden>M</span>
        </Link>
        <nav className="mr-sl-topbar__tabs" aria-label="Primary">
          <span
            className="mr-sl-topbar__tab mr-sl-topbar__tab--muted"
            aria-disabled
            data-tooltip="Coming soon"
          >
            Pages
          </span>
          <Link
            href="/"
            className="mr-sl-topbar__tab mr-sl-topbar__tab--active"
          >
            Sections
          </Link>
          <span
            className="mr-sl-topbar__tab mr-sl-topbar__tab--muted"
            aria-disabled
            data-tooltip="Coming soon"
          >
            Components
          </span>
        </nav>
      </div>

      <div className="mr-sl-topbar__search-wrap">
        {search ? (
          <label className="mr-sl-topbar__search">
            <span className="mr-sl-topbar__search-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search sections…"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              aria-label="Search marketplace"
            />
          </label>
        ) : null}
      </div>

      <div className="mr-sl-topbar__right">
        <button
          type="button"
          className="mr-sl-topbar__icon-btn"
          aria-label="Bookmarks"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M4.5 3.5h9v11l-4.5-3-4.5 3v-11z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="mr-sl-topbar__icon-btn"
          aria-label="Help"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="6.75" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M7.25 7.25a1.75 1.75 0 113.05 1.17c-.4.42-1.3.86-1.3 1.7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="12.75" r="0.6" fill="currentColor" />
          </svg>
        </button>
        <NotificationsMenu sections={sections} />
        <ProfileMenu sections={sections.length} />
      </div>
    </header>
  );
}

/* ──────────────────────── NotificationsMenu ──────────────────────── */
/**
 * Bell-icon dropdown surfacing every section awaiting curation (Submitted +
 * InReview lifecycles) as a dense list of rows: landscape thumbnail + name +
 * lifecycle/category meta. Footer link goes to the full review queue.
 *
 * Visible on all routes — the marketplace is an admin tool, so the bell
 * is always available and curator surfaces are not gated.
 */
const NOTIF_QUEUE: Lifecycle[] = ["Submitted", "InReview"];
// No cap — the dropdown is the only entry to pending curation now that the
// dedicated /review route is retired. The list scrolls inside the dropdown.
const NOTIF_MAX = 50;

export function NotificationsMenu({ sections }: { sections: ManifestEntry[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const queue = useMemo(() => {
    return sections
      .filter((s) => NOTIF_QUEUE.includes(getLifecycle(s)))
      .sort((a, b) => (a.attribution?.submittedAt ?? "").localeCompare(b.attribution?.submittedAt ?? ""));
  }, [sections]);
  const count = queue.length;
  const visible = queue.slice(0, NOTIF_MAX);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mr-mk-notif" ref={ref}>
      <button
        type="button"
        className="mr-sl-topbar__icon-btn mr-mk-notif__trigger"
        aria-label={`Notifications · ${count} pending curation`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M4.5 12.5h9l-1-1.5V8a3.5 3.5 0 10-7 0v3l-1 1.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 14a1.5 1.5 0 003 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {count > 0 ? <span className="mr-mk-notif__dot" aria-hidden /> : null}
      </button>

      {open ? (
        <div className="mr-mk-notif-menu" role="menu">
          <div className="mr-mk-notif-menu__header">
            <span className="mr-mk-notif-menu__title">Pending curation</span>
            <span className="mr-mk-notif-menu__count">{count}</span>
          </div>

          {count === 0 ? (
            <div className="mr-mk-notif-menu__empty">
              Queue is empty. Every submitted section has been reviewed.
            </div>
          ) : (
            <ul className="mr-mk-notif-menu__list">
              {visible.map((s) => {
                const lifecycle = getLifecycle(s);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/sections/${s.id}`}
                      className="mr-mk-notif-row"
                      onClick={() => setOpen(false)}
                    >
                      <div className="mr-mk-notif-row__thumb">
                        {s.previews?.static ? (
                          <img src={`/preview/${s.id}`} alt="" loading="lazy" />
                        ) : (
                          <span className="mr-mk-notif-row__fallback">{s.id.slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="mr-mk-notif-row__main">
                        <span className="mr-mk-notif-row__name">{s.name}</span>
                        <span className="mr-mk-notif-row__meta">
                          <span
                            className="mr-mk-notif-row__dot"
                            style={{ background: `var(--chrome-lifecycle-${lifecycle.toLowerCase()})` }}
                            aria-hidden
                          />
                          {lifecycleLabel(lifecycle)}
                          {s.category ? <> · {s.category}</> : null}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── ProfileMenu ─────────────────────────── */

type ThemeChoice = "light" | "dark" | "system";

function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" ? window.localStorage.getItem("mr-mk-theme") : null) as ThemeChoice | null;
    if (stored === "light" || stored === "dark" || stored === "system") setChoice(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    window.localStorage.setItem("mr-mk-theme", choice);
    if (choice !== "system") {
      root.dataset.theme = choice;
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { root.dataset.theme = mq.matches ? "dark" : "light"; };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);

  return [choice, setChoice];
}

export function ProfileMenu({ sections }: { sections: number }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mr-mk-profile" ref={ref}>
      <button
        type="button"
        className="mr-sl-topbar__avatar"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${sections} sections`}
        onClick={() => setOpen((o) => !o)}
      />

      {open ? (
        <div className="mr-mk-profile-menu" role="menu">
          <div className="mr-mk-profile-menu__header">
            <span className="mr-mk-profile-menu__badge">ADMIN</span>
            <div className="mr-mk-profile-menu__name">Matt Thompson</div>
            <div className="mr-mk-profile-menu__email">matt@makereign.com</div>
            <button type="button" className="mr-mk-profile-menu__view">View profile</button>
          </div>

          <hr className="mr-mk-profile-menu__divider" />

          <button type="button" className="mr-mk-profile-menu__item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Request content
          </button>
          <button type="button" className="mr-mk-profile-menu__item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5H2.5v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Give feedback
          </button>
          <button type="button" className="mr-mk-profile-menu__item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1.5v2M8 12.5v2M3.5 8h-2M14.5 8h-2M4.5 4.5l-1.5-1.5M13 13l-1.5-1.5M4.5 11.5L3 13M13 3l-1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Settings
          </button>

          <hr className="mr-mk-profile-menu__divider" />

          <div className="mr-mk-profile-menu__theme-row">
            <span className="mr-mk-profile-menu__theme-label">Theme</span>
            <div className="mr-mk-profile-menu__theme-toggle" role="radiogroup" aria-label="Theme">
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                aria-label="Light"
                className={`mr-mk-profile-menu__theme-btn${theme === "light" ? " mr-mk-profile-menu__theme-btn--active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1.1 1.1M10.4 10.4l1.1 1.1M2.5 11.5l1.1-1.1M10.4 3.6l1.1-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                aria-label="Dark"
                className={`mr-mk-profile-menu__theme-btn${theme === "dark" ? " mr-mk-profile-menu__theme-btn--active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M11.5 8.5a4.5 4.5 0 11-6-6 4.5 4.5 0 006 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "system"}
                aria-label="System"
                className={`mr-mk-profile-menu__theme-btn${theme === "system" ? " mr-mk-profile-menu__theme-btn--active" : ""}`}
                onClick={() => setTheme("system")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 1.75v10.5a5.25 5.25 0 000-10.5z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>

          <hr className="mr-mk-profile-menu__divider" />

          <button type="button" className="mr-mk-profile-menu__item">Log out</button>
        </div>
      ) : null}
    </div>
  );
}
