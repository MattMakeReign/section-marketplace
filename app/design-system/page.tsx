/**
 * /design-system — `@mr/tools-ui` showcase.
 *
 * Live demonstration of every primitive + composite tools-ui ships,
 * grouped by category. Doubles as a visual smoke test (you can flip the
 * theme on the page and immediately see every component in dark mode).
 */

import type { Metadata } from "next";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Tools UI — MakeReign Marketplace Design System",
  description: "Live showcase of @mr/tools-ui primitives and composites.",
};

export default function DesignSystemPage() {
  return <Showcase />;
}
