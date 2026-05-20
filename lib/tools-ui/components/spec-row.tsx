"use client";

import { type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * SpecRow — label/value grid row for detail-page specs tables.
 * Renders as a flex row with the label in mono-uppercase + the value
 * in body type. Compose multiple inside a <dl>.
 */

export function SpecRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mr-spec-row", className)}>
      <span className="mr-spec-row__label">{label}</span>
      <span className="mr-spec-row__value">{value}</span>
    </div>
  );
}
