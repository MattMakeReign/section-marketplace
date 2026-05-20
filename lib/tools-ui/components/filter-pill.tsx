"use client";

import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../primitives/popover";
import { cn } from "../lib/cn";

export type FilterOption = {
  id: string;
  label: string;
  count?: number;
  /** Optional CSS colour for a leading status dot. */
  dot?: string;
};

/**
 * FilterPill — icon + label + chevron, opens a Popover with a list of
 * single-select options. Marks itself "active" when value !== defaultId.
 *
 * Pure renderer + lightweight internal open-state. Selection is controlled
 * by the consumer.
 */

export function FilterPill({
  label,
  icon,
  value,
  options,
  onChange,
  defaultId = "all",
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (id: string) => void;
  /** ID treated as "no filter applied"; pill stays neutral. Defaults to "all". */
  defaultId?: string;
}) {
  const [open, setOpen] = useState(false);

  const isActive = value !== defaultId && options.some((o) => o.id === value && o.id !== defaultId);
  const activeLabel = options.find((o) => o.id === value)?.label ?? label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("mr-pill", isActive && "mr-pill--active")}
          aria-expanded={open}
        >
          {icon ? <span className="mr-pill__icon">{icon}</span> : null}
          <span>{isActive ? activeLabel : label}</span>
          <svg
            className="mr-pill__chevron"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="mr-pill-pop">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={cn(
              "mr-pill-pop__item",
              value === o.id && "mr-pill-pop__item--active",
            )}
            onClick={() => {
              onChange(o.id);
              setOpen(false);
            }}
            role="option"
            aria-selected={value === o.id}
          >
            <span className="mr-pill-pop__item-main">
              {o.dot ? (
                <span
                  className="mr-pill-pop__dot"
                  style={{ background: o.dot }}
                  aria-hidden
                />
              ) : null}
              {o.label}
            </span>
            {typeof o.count === "number" ? (
              <span className="mr-pill-pop__item-meta">{o.count}</span>
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
