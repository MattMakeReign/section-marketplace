import type { Metadata } from "next";
import "@mr/section-library-ui/styles.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "MakeReign Section Library",
  description: "Reusable, design-system-adaptive sections — the MakeReign Creative System catalogue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mr-chrome="marketplace-app" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
