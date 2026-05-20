import type { Metadata } from "next";
import "@mr/tools-ui/styles.css";
import "@mr/section-library-ui/styles.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "MakeReign Section Library",
  description: "Reusable, design-system-adaptive sections — the MakeReign Creative System catalogue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // data-mr-theme is the new attribute for @mr/tools-ui. data-theme stays in
  // parallel through chunks 2–7 so legacy mr-mk-* / mr-sl-* CSS keeps theming
  // correctly. Both removed in chunk 8.
  return (
    <html
      lang="en"
      data-mr-chrome="marketplace-app"
      data-theme="light"
      data-mr-theme="light"
    >
      <body>{children}</body>
    </html>
  );
}
