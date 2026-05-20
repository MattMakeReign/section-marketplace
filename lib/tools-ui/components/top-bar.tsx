"use client";

import { forwardRef, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "../lib/cn";

/**
 * TopBar — the marketplace's sticky header shell.
 *
 * Resolves the historical mr-mk-topbar / mr-sl-topbar duplication: one
 * canonical composite for every marketplace surface.
 *
 * Compose:
 *   <TopBar>
 *     <TopBar.Left>
 *       <TopBar.Brand href="/" label="MakeReign">M</TopBar.Brand>
 *       <TopBar.Tabs aria-label="Primary">
 *         <TopBar.Tab href="/" active>Sections</TopBar.Tab>
 *         <TopBar.Tab disabled tooltip="Coming soon">Pages</TopBar.Tab>
 *       </TopBar.Tabs>
 *     </TopBar.Left>
 *     <TopBar.Center>
 *       <TopBar.Search value={q} onChange={setQ} />
 *     </TopBar.Center>
 *     <TopBar.Right>
 *       <TopBar.IconButton aria-label="…">…</TopBar.IconButton>
 *       <NotificationsMenu … />
 *       <ProfileMenu … />
 *     </TopBar.Right>
 *   </TopBar>
 */

const TopBarRoot = forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <header ref={ref} className={cn("mr-topbar", className)} {...props} />
));
TopBarRoot.displayName = "TopBar";

const TopBarLeft = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mr-topbar__left", className)} {...props} />
  ),
);
TopBarLeft.displayName = "TopBar.Left";

const TopBarCenter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mr-topbar__center", className)} {...props} />
  ),
);
TopBarCenter.displayName = "TopBar.Center";

const TopBarRight = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mr-topbar__right", className)} {...props} />
  ),
);
TopBarRight.displayName = "TopBar.Right";

const TopBarBrand = forwardRef<
  HTMLAnchorElement,
  Omit<React.ComponentProps<typeof Link>, "href"> & { href: string; label: string }
>(({ className, label, children, ...props }, ref) => (
  <Link
    ref={ref}
    className={cn("mr-topbar__brand", className)}
    aria-label={label}
    {...props}
  >
    <span aria-hidden>{children}</span>
  </Link>
));
TopBarBrand.displayName = "TopBar.Brand";

const TopBarTabs = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} className={cn("mr-topbar__tabs", className)} {...props} />
  ),
);
TopBarTabs.displayName = "TopBar.Tabs";

type TopBarTabProps = {
  children: ReactNode;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
};

const TopBarTab = forwardRef<HTMLElement, TopBarTabProps>(
  ({ children, href, active, disabled, tooltip, className }, ref) => {
    const baseClass = cn(
      "mr-topbar__tab",
      active && "mr-topbar__tab--active",
      disabled && "mr-topbar__tab--muted",
      className,
    );
    if (disabled) {
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          className={baseClass}
          aria-disabled
          data-tooltip={tooltip}
        >
          {children}
        </span>
      );
    }
    if (href) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={baseClass}
        >
          {children}
        </Link>
      );
    }
    return (
      <span ref={ref as React.Ref<HTMLSpanElement>} className={baseClass}>
        {children}
      </span>
    );
  },
);
TopBarTab.displayName = "TopBar.Tab";

type TopBarSearchProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

const TopBarSearch = forwardRef<HTMLLabelElement, TopBarSearchProps>(
  ({ value, onChange, placeholder = "Search…", ariaLabel = "Search", className }, ref) => (
    <label ref={ref} className={cn("mr-topbar__search", className)}>
      <span className="mr-topbar__search-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
    </label>
  ),
);
TopBarSearch.displayName = "TopBar.Search";

const TopBarIconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", children, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn("mr-topbar__icon-btn", className)}
    {...props}
  >
    {children}
  </button>
));
TopBarIconButton.displayName = "TopBar.IconButton";

type TopBarStatic = {
  Left: typeof TopBarLeft;
  Center: typeof TopBarCenter;
  Right: typeof TopBarRight;
  Brand: typeof TopBarBrand;
  Tabs: typeof TopBarTabs;
  Tab: typeof TopBarTab;
  Search: typeof TopBarSearch;
  IconButton: typeof TopBarIconButton;
};

export type TopBarComponent = typeof TopBarRoot & TopBarStatic;

export const TopBar = TopBarRoot as TopBarComponent;
TopBar.Left = TopBarLeft;
TopBar.Center = TopBarCenter;
TopBar.Right = TopBarRight;
TopBar.Brand = TopBarBrand;
TopBar.Tabs = TopBarTabs;
TopBar.Tab = TopBarTab;
TopBar.Search = TopBarSearch;
TopBar.IconButton = TopBarIconButton;
