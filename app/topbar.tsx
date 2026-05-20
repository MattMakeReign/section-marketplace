"use client";

/**
 * <TopBar /> — shared marketplace shell.
 *
 * Used by the catalogue (/) and the section detail page (/sections/[id]) so
 * the notification bell, profile menu, bookmarks, help, and primary nav stay
 * consistent across every route.
 *
 * Migrated to @mr/tools-ui in chunk 2 of the tools-ui rebuild. The mr-mk-*
 * topbar / profile / notif classes are gone; everything is composed from
 * tools-ui primitives + composites now.
 */

import { useEffect, useMemo, useState } from "react";
import {
  type ManifestEntry,
  type Lifecycle,
  getLifecycle,
  lifecycleLabel,
} from "@mr/section-library-ui";
import {
  TopBar as ToolsTopBar,
  NotificationsMenu,
  ProfileMenu,
  type ProfileMenuTheme,
  type NotificationsMenuItem,
} from "@mr/tools-ui";

const NOTIF_QUEUE: Lifecycle[] = ["Submitted"];
// Cap dropdown at 12 — full queue lives at /review (restored in
// promotion-system-v2). The dropdown is the quick-glance entry point.
const NOTIF_MAX = 12;

export function TopBar({
  sections,
  search,
}: {
  sections: ManifestEntry[];
  search?: { value: string; onChange: (v: string) => void };
}) {
  return (
    <ToolsTopBar>
      <ToolsTopBar.Left>
        <ToolsTopBar.Brand href="/" label="MakeReign Section Library">
          M
        </ToolsTopBar.Brand>
        <ToolsTopBar.Tabs aria-label="Primary">
          <ToolsTopBar.Tab disabled tooltip="Coming soon">
            Pages
          </ToolsTopBar.Tab>
          <ToolsTopBar.Tab href="/" active>
            Sections
          </ToolsTopBar.Tab>
          <ToolsTopBar.Tab disabled tooltip="Coming soon">
            Components
          </ToolsTopBar.Tab>
        </ToolsTopBar.Tabs>
      </ToolsTopBar.Left>

      <ToolsTopBar.Center>
        {search ? (
          <ToolsTopBar.Search
            value={search.value}
            onChange={search.onChange}
            placeholder="Search sections…"
            ariaLabel="Search marketplace"
          />
        ) : null}
      </ToolsTopBar.Center>

      <ToolsTopBar.Right>
        <ToolsTopBar.IconButton aria-label="Bookmarks">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M4.5 3.5h9v11l-4.5-3-4.5 3v-11z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </ToolsTopBar.IconButton>
        <ToolsTopBar.IconButton aria-label="Help">
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
        </ToolsTopBar.IconButton>
        <NotificationsBell sections={sections} />
        <ProfileMenuShell sections={sections.length} />
      </ToolsTopBar.Right>
    </ToolsTopBar>
  );
}

/* ──────────────────────────── Notifications ──────────────────────────── */

function NotificationsBell({ sections }: { sections: ManifestEntry[] }) {
  const queue = useMemo(
    () =>
      sections
        .filter((s) => NOTIF_QUEUE.includes(getLifecycle(s)))
        .sort((a, b) =>
          (a.attribution?.submittedAt ?? "").localeCompare(b.attribution?.submittedAt ?? ""),
        ),
    [sections],
  );
  const count = queue.length;
  const visible = queue.slice(0, NOTIF_MAX);

  const items: NotificationsMenuItem[] = visible.map((s) => {
    const lifecycle = getLifecycle(s);
    return {
      id: s.id,
      href: `/sections/${s.id}`,
      name: s.name,
      thumbSrc: s.previews?.static ? `/preview/${s.id}` : undefined,
      dotColor: `var(--mr-lifecycle-${lifecycle.toLowerCase()})`,
      meta: (
        <>
          {lifecycleLabel(lifecycle)}
          {s.category ? <> · {s.category}</> : null}
        </>
      ),
    };
  });

  return (
    <NotificationsMenu
      ariaLabel={`Notifications · ${count} pending curation`}
      queueLabel="Pending curation"
      count={count}
      items={items}
      emptyMessage="Queue is empty. Every submitted section has been reviewed."
      footerHref="/review"
      footerLabel="Open review queue →"
      trigger={
        <ToolsTopBar.IconButton aria-label={`Notifications · ${count} pending curation`}>
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
          {count > 0 ? <span className="mr-topbar__icon-btn__dot" aria-hidden /> : null}
        </ToolsTopBar.IconButton>
      }
    />
  );
}

/* ──────────────────────────── Profile ──────────────────────────── */

function useTheme(): [ProfileMenuTheme, (t: ProfileMenuTheme) => void] {
  const [choice, setChoice] = useState<ProfileMenuTheme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? window.localStorage.getItem("mr-mk-theme")
      : null) as ProfileMenuTheme | null;
    if (stored === "light" || stored === "dark" || stored === "system") setChoice(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    window.localStorage.setItem("mr-mk-theme", choice);
    // Dual-write through chunks 2–7 of the tools-ui migration:
    //   - data-theme       → legacy mr-mk-* / mr-sl-* CSS reads this
    //   - data-mr-theme    → @mr/tools-ui reads this
    // Chunk 8 removes data-theme entirely.
    if (choice !== "system") {
      root.dataset.theme = choice;
      root.dataset.mrTheme = choice;
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = mq.matches ? "dark" : "light";
      root.dataset.theme = resolved;
      root.dataset.mrTheme = resolved;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);

  return [choice, setChoice];
}

function ProfileMenuShell({ sections }: { sections: number }) {
  const [theme, setTheme] = useTheme();

  return (
    <ProfileMenu
      trigger={
        <button
          type="button"
          className="mr-avatar"
          aria-label="Account"
          title={`${sections} sections`}
        />
      }
      badge="ADMIN"
      name="Matt Thompson"
      email="matt@makereign.com"
      viewProfileLabel="View profile"
      onViewProfile={() => undefined}
      actionItems={[
        {
          id: "request",
          label: "Request content",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: "feedback",
          label: "Give feedback",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2.5 3.5h11v7h-6l-3 2.5v-2.5H2.5v-7z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          id: "settings",
          label: "Settings",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 1.5v2M8 12.5v2M3.5 8h-2M14.5 8h-2M4.5 4.5l-1.5-1.5M13 13l-1.5-1.5M4.5 11.5L3 13M13 3l-1.5 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
      ]}
      theme={theme}
      onThemeChange={setTheme}
      logoutLabel="Log out"
      onLogout={() => undefined}
    />
  );
}

// Re-exports for back-compat with any callers — same names as before.
export { NotificationsBell as NotificationsMenu };
export { ProfileMenuShell as ProfileMenu };
