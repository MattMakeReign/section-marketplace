"use client";

import { type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "../primitives/dropdown-menu";
import { cn } from "../lib/cn";

/**
 * ProfileMenu — avatar-anchored dropdown with admin badge, profile header,
 * action items, theme switcher, and log-out. Material-blur dark surface.
 *
 * Pure renderer — consumer wires theme state + handlers + action items.
 */

export type ProfileMenuTheme = "light" | "dark" | "system";

export type ProfileMenuActionItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
};

export function ProfileMenu({
  trigger,
  badge = "ADMIN",
  name,
  email,
  viewProfileLabel = "View profile",
  onViewProfile,
  actionItems = [],
  theme,
  onThemeChange,
  logoutLabel = "Log out",
  onLogout,
  className,
}: {
  trigger: ReactNode;
  badge?: string;
  name: string;
  email: string;
  viewProfileLabel?: string;
  onViewProfile?: () => void;
  actionItems?: ProfileMenuActionItem[];
  theme: ProfileMenuTheme;
  onThemeChange: (next: ProfileMenuTheme) => void;
  logoutLabel?: string;
  onLogout?: () => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        tone="dark"
        align="end"
        sideOffset={8}
        className={cn("mr-profile-menu", className)}
      >
        <div className="mr-profile-menu__header">
          {badge ? <span className="mr-profile-menu__badge">{badge}</span> : null}
          <div className="mr-profile-menu__name">{name}</div>
          <div className="mr-profile-menu__email">{email}</div>
          {onViewProfile ? (
            <button
              type="button"
              className="mr-profile-menu__view"
              onClick={onViewProfile}
            >
              {viewProfileLabel}
            </button>
          ) : null}
        </div>

        {actionItems.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {actionItems.map((it) => (
              <DropdownMenuItem
                key={it.id}
                disabled={it.disabled}
                onSelect={(e) => {
                  if (it.disabled) return;
                  e.preventDefault();
                  it.onSelect?.();
                }}
              >
                {it.icon ? <span className="mr-profile-menu__icon" aria-hidden>{it.icon}</span> : null}
                {it.label}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />

        <div className="mr-profile-menu__theme-row">
          <span className="mr-profile-menu__theme-label">Theme</span>
          <div className="mr-profile-menu__theme-toggle" role="radiogroup" aria-label="Theme">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                aria-label={t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
                className={cn(
                  "mr-profile-menu__theme-btn",
                  theme === t && "mr-profile-menu__theme-btn--active",
                )}
                onClick={() => onThemeChange(t)}
              >
                <ThemeIcon variant={t} />
              </button>
            ))}
          </div>
        </div>

        {onLogout ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onLogout();
              }}
            >
              {logoutLabel}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeIcon({ variant }: { variant: ProfileMenuTheme }) {
  if (variant === "light") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1.1 1.1M10.4 10.4l1.1 1.1M2.5 11.5l1.1-1.1M10.4 3.6l1.1-1.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (variant === "dark") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M11.5 8.5a4.5 4.5 0 11-6-6 4.5 4.5 0 006 6z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 1.75v10.5a5.25 5.25 0 000-10.5z" fill="currentColor" />
    </svg>
  );
}
