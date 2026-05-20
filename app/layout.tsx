import type { Metadata } from "next";
import "@mr/tools-ui/styles.css";
import "@mr/section-library-ui/styles.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "MakeReign Section Library",
  description: "Reusable, design-system-adaptive sections — the MakeReign Creative System catalogue.",
};

/**
 * Pre-hydration theme init.
 *
 * Runs synchronously in <head> BEFORE React renders anything, so the
 * data-theme + data-mr-theme attributes are set from localStorage before
 * any pixel paints. Eliminates the flash-of-wrong-theme on navigation.
 *
 * Inlined as a stringified IIFE because <Script> components don't run
 * early enough — by the time they execute, layout markup has already
 * painted in the SSR-default theme.
 *
 * Honours "system" as a third valid choice by consulting prefers-color-scheme.
 */
const themeInitScript = `(function(){try{var k='mr-mk-theme';var v=localStorage.getItem(k);var t='light';if(v==='light'||v==='dark'){t=v;}else if(v==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.setAttribute('data-theme',t);r.setAttribute('data-mr-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // data-mr-theme is the new attribute for @mr/tools-ui. data-theme stays in
  // parallel through chunks 2–7 so legacy mr-mk-* / mr-sl-* CSS keeps theming
  // correctly. Both removed in chunk 9 cleanup.
  //
  // The initial values here are placeholders — the inline themeInitScript
  // in <head> overrides them from localStorage BEFORE React hydrates.
  return (
    <html
      lang="en"
      data-mr-chrome="marketplace-app"
      data-theme="light"
      data-mr-theme="light"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
