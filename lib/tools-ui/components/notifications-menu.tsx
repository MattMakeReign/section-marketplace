"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { cn } from "../lib/cn";

/**
 * NotificationsMenu — bell-icon dropdown surfacing pending curation rows.
 *
 * Pure renderer — the consumer (marketplace's topbar.tsx) does the filtering
 * + URL construction and passes a declarative `items` array. No knowledge of
 * lifecycle vocab here.
 */

export type NotificationsMenuItem = {
  /** Unique id, used as React key. */
  id: string;
  /** Item link target. */
  href: string;
  /** Primary text — typically the section name. */
  name: string;
  /** Optional thumbnail src. If absent, falls back to `id` initials. */
  thumbSrc?: string;
  /** Optional CSS colour for the leading status dot. */
  dotColor?: string;
  /** Meta line — typically lifecycle label · category. */
  meta?: ReactNode;
};

export function NotificationsMenu({
  trigger,
  ariaLabel,
  queueLabel = "Pending curation",
  count,
  items,
  emptyMessage = "Queue is empty.",
  footerHref,
  footerLabel,
  className,
}: {
  /** The icon-button shown as the trigger (e.g. a bell button). */
  trigger: ReactNode;
  ariaLabel?: string;
  /** Header title for the dropdown. */
  queueLabel?: string;
  /** Total count — displayed in the header. */
  count: number;
  /** Rows to render. Empty → empty state. */
  items: NotificationsMenuItem[];
  /** Empty-state message. */
  emptyMessage?: string;
  /** Optional footer link target. */
  footerHref?: string;
  /** Optional footer link label. */
  footerLabel?: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild aria-label={ariaLabel ?? `Notifications · ${count} pending`}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        tone="dark"
        align="end"
        sideOffset={8}
        className={cn("mr-notif-menu", className)}
      >
        <div className="mr-notif-menu__header">
          <span className="mr-notif-menu__title">{queueLabel}</span>
          <span className="mr-notif-menu__count">{count}</span>
        </div>

        {items.length === 0 ? (
          <div className="mr-notif-menu__empty">{emptyMessage}</div>
        ) : (
          <ul className="mr-notif-menu__list">
            {items.map((it) => (
              <li key={it.id}>
                <Link href={it.href} className="mr-notif-row">
                  <div className="mr-notif-row__thumb">
                    {it.thumbSrc ? (
                      <img src={it.thumbSrc} alt="" loading="lazy" />
                    ) : (
                      <span className="mr-notif-row__fallback">{it.id.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="mr-notif-row__main">
                    <span className="mr-notif-row__name">{it.name}</span>
                    {it.meta ? (
                      <span className="mr-notif-row__meta">
                        {it.dotColor ? (
                          <span
                            className="mr-notif-row__dot"
                            style={{ background: it.dotColor }}
                            aria-hidden
                          />
                        ) : null}
                        {it.meta}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {footerHref ? (
          <Link href={footerHref} className="mr-notif-menu__footer">
            {footerLabel ?? "View all →"}
          </Link>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
