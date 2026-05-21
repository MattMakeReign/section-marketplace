"use client";

/**
 * MotionProvider — re-export shell.
 *
 * Per `task-marketplace-runtime-frozen-wrapper` (2026-05-21): the marketplace
 * must render sections PIXEL-IDENTICAL to their origin project. To guarantee
 * that, the motion runtime is shared with every project via `@mr/canonical-stack`
 * (vendored at `lib/canonical-stack/`). This file is a thin shell so existing
 * `@/components/motion-provider` imports keep resolving.
 *
 * Edit the runtime at `lib/canonical-stack/motion-provider.tsx`, not here.
 */

export { MotionProvider } from "@mr/canonical-stack";
