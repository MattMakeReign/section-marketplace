"use client";

/**
 * useAssetUpload — marketplace preview stub.
 *
 * In a project, this hook talks to the local mr-agent WebSocket to write
 * uploaded image bytes to `sections/<id>/assets/`. The marketplace has no
 * project / agent, so uploads in MediaManager have nowhere to land — we
 * surface a console hint and reject so the editor.tsx can show its error
 * state instead of silently dropping the file.
 *
 * Editors still import this from `@/components/use-asset-upload` (same path
 * shape as their origin project), so the marketplace just supplies a no-op
 * implementation behind that alias.
 */

import { useCallback } from "react";

export function useAssetUpload() {
  return useCallback(async (_path: string, _file: Blob): Promise<number> => {
    throw new Error(
      "Asset uploads aren't available in marketplace preview — install the section into a project to add your own media.",
    );
  }, []);
}
