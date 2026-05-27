"use client";

import { forwardRef } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

/**
 * Accordion — Radix Accordion themed with .ds-accordion__* classes.
 *
 *   <Accordion type="multiple" defaultValue={["layout"]}>
 *     <AccordionItem value="layout">
 *       <AccordionTrigger>Layout</AccordionTrigger>
 *       <AccordionContent>…rows…</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 */

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={`ds-accordion__item ${className ?? ""}`.trim()}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ children, ...props }, ref) => (
  <AccordionPrimitive.Header className="ds-accordion__header">
    <AccordionPrimitive.Trigger
      ref={ref}
      className="ds-accordion__trigger"
      {...props}
    >
      <span>{children}</span>
      <svg
        className="ds-accordion__chevron"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
      >
        <path
          d="M3 4.5l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="ds-accordion__content"
    {...props}
  >
    <div className="ds-accordion__content-inner">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";
