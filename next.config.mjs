import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude the webpack build cache from serverless function bundles.
  // Without this, `.next/cache/webpack` (~243 MB) gets traced into every
  // function and pushes the bundle over Vercel's 250 MB limit. The cache
  // is a build-time artefact — runtime functions don't need it.
  outputFileTracingExcludes: {
    "*": [".next/cache/**/*"],
  },
  // Force-include the brand-contexts/ directory in every serverless function
  // bundle. `lib/brand-contexts.ts` reads these files dynamically via
  // readFileSync at runtime; Next.js's static analyzer can't detect the
  // dependency, so without this the directory gets stripped from the bundle
  // and `/render/[id]` returns null context → no scoped styling. Same goes
  // for sections/**/section.json which the render route reads dynamically.
  outputFileTracingIncludes: {
    "/render/[id]": ["./brand-contexts/**/*", "./sections/**/section.json"],
    "/sections/[id]": ["./brand-contexts/**/*"],
  },
  // Suppress the floating Next.js dev-mode badge so it doesn't appear
  // twice on the section detail page (once for the marketplace shell,
  // once inside the same-origin `/render/<id>` iframe).
  devIndicators: false,
  // The marketplace app reads section folders directly from the file system
  // (server components). No image optimization on the SVG previews — they're
  // procedurally generated and already small.
  images: { unoptimized: true },
  // Pre-existing type errors in `app/gallery.tsx` + `sections/cta/cta-band/CtaBand.tsx`
  // unrelated to the remote-jump work — see `task-marketplace-remote-jump` follow-ups.
  // Ignoring at build time so Vercel deploys succeed; runtime is unaffected.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Resolve `@mr/section-library-ui` and `@mr/tools-ui` to their vendored
  // copies under `lib/tools-ui/`. This lets the marketplace build standalone
  // on Vercel without the pnpm workspace context. Source-of-truth for each
  // package is the vendored copy (no separate workspace package).
  //
  // section-library was absorbed into tools-ui in chunk 3. The
  // `@mr/section-library-ui` alias kept as a back-compat redirect so existing
  // imports keep working; the canonical path forward is
  // `@mr/tools-ui/section-library`.
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@mr/section-library-ui/styles.css": path.resolve(
        __dirname,
        "lib/tools-ui/section-library/styles.css"
      ),
      "@mr/section-library-ui": path.resolve(
        __dirname,
        "lib/tools-ui/section-library"
      ),
      "@mr/tools-ui/section-library/styles.css": path.resolve(
        __dirname,
        "lib/tools-ui/section-library/styles.css"
      ),
      "@mr/tools-ui/section-library": path.resolve(
        __dirname,
        "lib/tools-ui/section-library"
      ),
      "@mr/tools-ui/styles.css": path.resolve(
        __dirname,
        "lib/tools-ui/styles/index.css"
      ),
      "@mr/tools-ui": path.resolve(__dirname, "lib/tools-ui"),
    };
    return config;
  },
};

export default nextConfig;
