"use client";

/**
 * CaptureClient — the section video recorder workspace.
 *
 * State machine:
 *
 *   idle ─▶ permission ─▶ countdown ─▶ recording ─▶ review ─▶ saving ─▶ done
 *                                                     │
 *                                                     └─▶ idle (re-record)
 *
 * Steps in plain English:
 *   1. idle      — section renders in a chromeless iframe. "Start recording" button.
 *   2. permission— call getDisplayMedia, browser shows the tab picker. On cancel → idle.
 *   3. countdown — toolbar hides, 3-2-1 overlay, then the stage enters fullscreen.
 *   4. recording — MediaRecorder captures the stream. Stop on click or 12s hard cap.
 *   5. review    — exit fullscreen. Show the clip with a timeline + in/out handles
 *                  + thumbnail frame picker.
 *   6. saving    — ffmpeg.wasm trims + re-encodes; canvas draws the thumb frame;
 *                  upload both via POST /api/sections/[id]/preview-upload; PUT both
 *                  URLs via /api/sections/[id]/curation.
 *   7. done      — link back to detail.
 *
 * Recording technique:
 *   - getDisplayMedia({preferCurrentTab: true, video: {frameRate: 30}, audio: false})
 *   - MediaRecorder with mimeType 'video/webm;codecs=vp9' @ 2.5 Mbps
 *   - 8s soft target, 12s hard cap (auto-stop)
 *
 * Compression / trim:
 *   - ffmpeg.wasm single-threaded build (no SAB requirement → no COOP/COEP setup)
 *   - Trim: `ffmpeg -ss <in> -i recording.webm -t <duration> -c copy trimmed.webm`
 *     (stream copy when possible — fast, lossless) followed by an aggressive
 *     re-encode `-c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -an out.webm` if the
 *     copy result is still over 8 MB.
 *   - Thumbnail: `ffmpeg -ss <thumb_t> -i recording.webm -frames:v 1 -q:v 2 thumb.png`
 *
 * Size budget:
 *   - Soft warn at > 8 MB, hard block at > 15 MB (Supabase bucket cap).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@mr/tools-ui";
import type { ManifestEntry } from "@mr/section-library-ui";
import "./capture.css";

const SOFT_CAP_S = 8;
const HARD_CAP_S = 12;
const SOFT_BUDGET_BYTES = 8 * 1024 * 1024;
const HARD_BUDGET_BYTES = 15 * 1024 * 1024;
// Capture target — 1280×720 @ 60fps × 2.5 Mbps.
//
// Without these constraints Chrome captures at the user's native
// monitor resolution (3456×1804 on retina laptops) and at full
// MediaRecorder bitrate, producing ~5 MB for 5s — way too heavy for
// a hover thumbnail. Aggressive compression:
//   - 720p downscale: ~75% size cut vs 3456×1804
//   - 2.5 Mbps cap: another ~70% cut vs the previous 8 Mbps default
//   - Combined: ~1.5 MB for 5s, ~2.5 MB for 8s
//
// 60fps preserved so Lenis smooth-scroll + GSAP motion still look
// smooth — fewer fps would chop visible motion noticeably.
const RECORDER_WIDTH = 1280;
const RECORDER_HEIGHT = 720;
const RECORDER_FRAMERATE = 60;
const RECORDER_BITRATE = 2_500_000;

type Phase = "idle" | "permission" | "countdown" | "recording" | "review" | "saving" | "done";

/** ffmpeg.wasm is heavy — load it only on first save. */
type FFmpegHandle = {
  ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg;
};
let ffmpegHandle: FFmpegHandle | null = null;
async function getFFmpeg(): Promise<FFmpegHandle> {
  if (ffmpegHandle) return ffmpegHandle;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();
  // CDN-hosted single-threaded core — avoids the COOP/COEP / SharedArrayBuffer
  // setup. ~13 MB. unpkg edge-caches it after first load.
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegHandle = { ffmpeg };
  return ffmpegHandle;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function CaptureClient({ section }: { section: ManifestEntry }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  // True only when CropTarget successfully applied — otherwise the HUD
  // would be visible in the recording, so we hide it and use Esc to stop.
  const [hudVisible, setHudVisible] = useState<boolean>(true);

  // Recording artefacts.
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);

  // Trim + thumb state (seconds).
  const [trimIn, setTrimIn] = useState<number>(0);
  const [trimOut, setTrimOut] = useState<number>(0);
  const [thumbTime, setThumbTime] = useState<number>(0);
  const [thumbDataUrl, setThumbDataUrl] = useState<string | null>(null);

  // Review-player state.
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  // Tracks which handle the user is dragging on the timeline (none = idle).
  const [dragging, setDragging] = useState<"in" | "out" | "scrub" | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Save progress.
  const [savingStep, setSavingStep] = useState<string>("");
  const [savedSummary, setSavedSummary] = useState<{ videoUrl: string; thumbUrl: string; videoBytes: number } | null>(
    null,
  );

  // Refs to the recording surface.
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStartRef = useRef<number>(0);
  const recordingTickerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      if (recordingTickerRef.current !== null) {
        window.clearInterval(recordingTickerRef.current);
      }
    };
  }, [recordedUrl]);

  /** Re-derive trimOut when a new clip loads. */
  useEffect(() => {
    if (duration > 0) {
      setTrimIn(0);
      setTrimOut(Math.min(duration, SOFT_CAP_S));
      setThumbTime(Math.min(duration / 2, duration));
    }
  }, [duration]);

  /** Pause the review video when phase isn't review. */
  useEffect(() => {
    if (phase !== "review" && reviewVideoRef.current) {
      reviewVideoRef.current.pause();
    }
  }, [phase]);

  const stopRecording = useCallback(() => {
    // Ticker only updates the timer state — safe to kill early.
    if (recordingTickerRef.current !== null) {
      window.clearInterval(recordingTickerRef.current);
      recordingTickerRef.current = null;
    }
    // Tell MediaRecorder to stop. We do NOT stop the underlying tracks
    // or change any layout here — both of those cause the iframe's
    // computed rect to shift, and CropTarget tracks the iframe rect, so
    // the recording's final ~200ms would contain a frame jump / black
    // boxing. Stream cleanup happens INSIDE the recorder's "stop"
    // listener once the blob is finalised.
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* noop */
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setPhase("permission");

    // Pick the most compressed codec the browser will give us.
    const candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) {
      setError("Your browser doesn't support WebM recording. Try Chrome or Edge.");
      setPhase("idle");
      return;
    }

    let stream: MediaStream;
    // Region Capture: if the browser supports CropTarget + CaptureController
    // we crop the captured stream to ONLY the iframe rect, so our HUD
    // (timer + stop button) doesn't end up in the recording. Chrome 104+.
    const CC = (globalThis as { CaptureController?: new () => unknown })
      .CaptureController;
    const CT = (globalThis as { CropTarget?: { fromElement?: (el: Element) => Promise<unknown> } })
      .CropTarget;
    type ControllerWithCrop = { cropTo: (target: unknown) => Promise<void> };
    const controller =
      typeof CC === "function" ? (new CC() as ControllerWithCrop) : null;
    let cropApplied = false;
    try {
      // preferCurrentTab puts the active tab at the top of the picker on
      // Chrome 105+. selfBrowserSurface allows capturing this same tab.
      // cursor: 'never' tells the browser to omit the OS mouse cursor from
      // the captured stream — the section in the recording stays clean.
      const constraints: DisplayMediaStreamOptions & {
        preferCurrentTab?: boolean;
        selfBrowserSurface?: "include" | "exclude";
        surfaceSwitching?: "include" | "exclude";
        controller?: unknown;
      } = {
        video: {
          frameRate: RECORDER_FRAMERATE,
          width: RECORDER_WIDTH,
          height: RECORDER_HEIGHT,
          // cursor stays visible in the recording — designer can hover
          // interactive elements and have the pointer captured.
          cursor: "always",
        } as MediaTrackConstraints,
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
      };
      if (controller) constraints.controller = controller;
      stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Crop the stream to just the iframe so HUD elements outside the
      // iframe rect aren't in the recording. Chrome 104+.
      if (controller && CT?.fromElement && iframeRef.current) {
        try {
          const cropTarget = await CT.fromElement(iframeRef.current);
          await controller.cropTo(cropTarget);
          cropApplied = true;
        } catch (cropErr) {
          // Surface the failure so we can see WHY in dev tools. The
          // recording will continue at full-tab — but we hide all HUDs
          // below so the file at least doesn't contain stray UI chrome.
          // eslint-disable-next-line no-console
          console.warn("[capture] CropTarget.cropTo failed:", cropErr);
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn("[capture] CropTarget not available", {
          hasController: !!controller,
          hasCT: !!CT?.fromElement,
          hasIframe: !!iframeRef.current,
        });
      }
      // hudVisible drives whether we render the recording HUD at all.
      // We ALWAYS keep it false now — the timer / stop button were ending
      // up in the recording when CropTarget silently no-op'd. Esc-to-stop
      // (keyboard) + auto-stop at 12s are the only stop controls during
      // recording.
      setHudVisible(false);
      // eslint-disable-next-line no-console
      console.log("[capture] crop applied:", cropApplied);
    } catch (e) {
      // User cancelled the picker, or permission denied.
      setPhase("idle");
      if ((e as Error)?.name !== "NotAllowedError") {
        setError(`Couldn't access the screen: ${(e as Error)?.message ?? e}`);
      }
      return;
    }

    streamRef.current = stream;

    // Listen for the user clicking "Stop sharing" in the browser's
    // share-bar — that ends the tracks externally; we react by finalising
    // the recording.
    for (const track of stream.getVideoTracks()) {
      track.addEventListener("ended", () => stopRecording());
    }

    // Set up MediaRecorder.
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: RECORDER_BITRATE,
    });
    recordedChunksRef.current = [];
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    });
    recorder.addEventListener("stop", () => {
      // Recorder has fully drained — NOW safe to release the screen
      // stream. Doing this before "stop" would chop the recording's
      // tail and cause a black/letterboxed frame at the end.
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
      const blob = new Blob(recordedChunksRef.current, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setPhase("review");
    });
    mediaRecorderRef.current = recorder;

    // Countdown 3-2-1, then enter fullscreen and start recording.
    setPhase("countdown");
    for (let n = 3; n > 0; n--) {
      setCountdown(n);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 700));
    }
    setCountdown(0);

    // NB: deliberately NO requestFullscreen() here. Entering or exiting
    // fullscreen reflows the iframe (different viewport-derived
    // max-height), which moves the CropTarget region mid-recording and
    // causes the jitter / black-boxing the designer reported. We keep
    // the iframe at its fixed 1440×810 throughout the whole lifecycle.

    setPhase("recording");
    recordingStartRef.current = performance.now();
    setRecordSeconds(0);
    // 1000ms timeslices = fewer `dataavailable` callbacks during the
    // capture, which leaves more main-thread headroom for GSAP /
    // Lenis / paint to keep 60fps.
    recorder.start(1000);
    recordingTickerRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - recordingStartRef.current) / 1000;
      setRecordSeconds(elapsed);
      if (elapsed >= HARD_CAP_S) {
        stopRecording();
      }
    }, 100);
  }, [stopRecording]);

  /** Esc stops recording — primary stop trigger when the HUD is hidden. */
  useEffect(() => {
    if (phase !== "recording") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, stopRecording]);

  /* ─── Custom review-player controls ─── */

  const togglePlay = useCallback(() => {
    const v = reviewVideoRef.current;
    if (!v) return;
    if (v.paused) {
      // If we're outside the trim range, snap back in.
      if (v.currentTime < trimIn || v.currentTime >= trimOut) {
        v.currentTime = trimIn;
      }
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [trimIn, trimOut]);

  // Loop playback within the trim window so the user previews exactly
  // what'll get saved.
  useEffect(() => {
    const v = reviewVideoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime >= trimOut && !v.paused) {
        v.currentTime = trimIn;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [trimIn, trimOut, recordedUrl]);

  // Convert a pointer X position on the timeline → seconds in the video.
  const timeFromClientX = useCallback(
    (clientX: number) => {
      const tl = timelineRef.current;
      if (!tl || duration <= 0) return 0;
      const rect = tl.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return frac * duration;
    },
    [duration],
  );

  // Pointer-move + pointer-up for dragging in/out handles + scrub.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const t = timeFromClientX(e.clientX);
      const v = reviewVideoRef.current;
      if (dragging === "in") {
        const nextIn = Math.max(0, Math.min(t, trimOut - 0.1));
        setTrimIn(nextIn);
        if (v) v.currentTime = nextIn;
      } else if (dragging === "out") {
        const nextOut = Math.max(trimIn + 0.1, Math.min(t, duration));
        setTrimOut(nextOut);
        if (v) v.currentTime = nextOut;
      } else if (dragging === "scrub") {
        if (v) v.currentTime = Math.max(0, Math.min(t, duration));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, trimIn, trimOut, duration, timeFromClientX]);

  const restart = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setTrimIn(0);
    setTrimOut(0);
    setThumbTime(0);
    setThumbDataUrl(null);
    setSavedSummary(null);
    setError(null);
    setPhase("idle");
  }, [recordedUrl]);

  const onLoadedMetadata = useCallback(() => {
    const v = reviewVideoRef.current;
    if (!v) return;
    // Some recordings report Infinity for duration until seeked. Force a
    // seek to a huge offset, then back to 0, to make Chrome compute it.
    if (!Number.isFinite(v.duration) || v.duration === 0) {
      v.currentTime = 1e9;
      v.addEventListener(
        "timeupdate",
        function fix() {
          v.currentTime = 0;
          v.removeEventListener("timeupdate", fix);
          setDuration(v.duration);
        },
        { once: true },
      );
    } else {
      setDuration(v.duration);
    }
  }, []);

  /** Grab the thumbnail from the video element at the given time
   *  (defaults to the current playhead so callers can do
   *  `grabThumb()` without juggling state). */
  const grabThumb = useCallback(async (atTime?: number) => {
    const v = reviewVideoRef.current;
    if (!v) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const seekTarget = typeof atTime === "number" ? atTime : v.currentTime;
    const wasPaused = v.paused;
    if (!wasPaused) v.pause();
    v.currentTime = seekTarget;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        v.removeEventListener("seeked", onSeeked);
        resolve();
      };
      v.addEventListener("seeked", onSeeked, { once: true });
    });
    ctx.drawImage(v, 0, 0, w, h);
    setThumbDataUrl(canvas.toDataURL("image/png"));
    setThumbTime(seekTarget);
  }, []);

  const save = useCallback(async () => {
    if (!recordedBlob || !thumbDataUrl) return;
    setPhase("saving");
    setError(null);

    try {
      // 1) Load ffmpeg.wasm (lazy, ~13MB on first use).
      setSavingStep("Loading video tools…");
      const { ffmpeg } = await getFFmpeg();

      // 2) Write the source clip into ffmpeg's virtual FS.
      setSavingStep("Trimming & compressing…");
      const sourceBytes = new Uint8Array(await recordedBlob.arrayBuffer());
      await ffmpeg.writeFile("in.webm", sourceBytes);

      // 3) Trim via stream-copy. We don't re-encode — VP9 encode in
      //    ffmpeg.wasm blows the WASM heap on most clips ("memory access
      //    out of bounds"). The source recording is already VP9 at
      //    2.5 Mbps from MediaRecorder, so we just slice the container.
      //
      //    Stream-copy snaps the cut to the nearest keyframe (typically
      //    every 1–2s for MediaRecorder output) — that's acceptable for
      //    8s preview clips. If sub-second precision becomes important
      //    later, switch to libvpx (VP8 — lighter memory) for an encode.
      const trimDuration = Math.max(0.1, trimOut - trimIn);
      const ffArgs = [
        "-ss",
        trimIn.toFixed(3),
        "-i",
        "in.webm",
        "-t",
        trimDuration.toFixed(3),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        "-an",
        "out.webm",
      ];
      await ffmpeg.exec(ffArgs);
      const trimmedData = await ffmpeg.readFile("out.webm");
      const trimmedBlob = new Blob([trimmedData as Uint8Array], { type: "video/webm" });

      // 4) Budget check.
      if (trimmedBlob.size > HARD_BUDGET_BYTES) {
        setError(
          `Trimmed clip is ${formatBytes(trimmedBlob.size)} which exceeds the ${formatBytes(HARD_BUDGET_BYTES)} Supabase limit. Trim shorter or re-record with less motion.`,
        );
        setPhase("review");
        return;
      }
      if (trimmedBlob.size > SOFT_BUDGET_BYTES) {
        const ok = window.confirm(
          `Trimmed clip is ${formatBytes(trimmedBlob.size)} (over the ${formatBytes(SOFT_BUDGET_BYTES)} target). Upload anyway?`,
        );
        if (!ok) {
          setPhase("review");
          return;
        }
      }

      // 5) Convert thumb data URL → blob.
      const thumbBlob = await (await fetch(thumbDataUrl)).blob();

      // 6) Upload video.
      setSavingStep("Uploading video…");
      const videoForm = new FormData();
      videoForm.append("file", new File([trimmedBlob], `preview.webm`, { type: "video/webm" }));
      const videoUpRes = await fetch(`/api/sections/${section.id}/preview-upload`, {
        method: "POST",
        body: videoForm,
      });
      const videoUpData = (await videoUpRes.json()) as { ok: boolean; url?: string; error?: string };
      if (!videoUpData.ok || !videoUpData.url) {
        throw new Error(videoUpData.error ?? "Video upload failed");
      }

      // 7) Upload thumbnail.
      setSavingStep("Uploading thumbnail…");
      const thumbForm = new FormData();
      thumbForm.append("file", new File([thumbBlob], `preview.png`, { type: "image/png" }));
      const thumbUpRes = await fetch(`/api/sections/${section.id}/preview-upload`, {
        method: "POST",
        body: thumbForm,
      });
      const thumbUpData = (await thumbUpRes.json()) as { ok: boolean; url?: string; error?: string };
      if (!thumbUpData.ok || !thumbUpData.url) {
        throw new Error(thumbUpData.error ?? "Thumbnail upload failed");
      }

      // 8) Persist both URLs on section.json — with a cache-busting
      //    version query so the detail page picks up the NEW bytes
      //    immediately. Supabase upserts the file at a stable path
      //    (<id>/preview.{webm,png}), and the CDN caches it for 5 min;
      //    without ?v=… the browser keeps serving the previous take
      //    after a re-record.
      const version = Date.now();
      setSavingStep("Updating section.json…");
      const curationRes = await fetch(`/api/sections/${section.id}/curation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewVideoUrl: `${videoUpData.url}?v=${version}`,
          previewStaticUrl: `${thumbUpData.url}?v=${version}`,
        }),
      });
      const curationData = (await curationRes.json()) as { ok: boolean; error?: string };
      if (!curationData.ok) {
        throw new Error(curationData.error ?? "Couldn't update section.json");
      }

      setSavedSummary({
        videoUrl: `${videoUpData.url}?v=${version}`,
        thumbUrl: `${thumbUpData.url}?v=${version}`,
        videoBytes: trimmedBlob.size,
      });
      setPhase("done");
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
      setPhase("review");
    }
  }, [recordedBlob, thumbDataUrl, trimIn, trimOut, section.id]);

  /* ─────────────────────────────  Render  ───────────────────────────── */

  const renderSrc = useMemo(() => `/render/${section.id}`, [section.id]);
  const overBudgetSoft = recordedBlob && recordedBlob.size > SOFT_BUDGET_BYTES;

  return (
    <div className="mr-cap-root" data-phase={phase}>
      {/* ── Top toolbar (idle + review) ── */}
      {(phase === "idle" || phase === "review" || phase === "done") && (
        <header className="mr-cap-topbar">
          <div className="mr-cap-topbar__left">
            <Link href={`/sections/${section.id}`} className="mr-cap-back">
              ← Back to section
            </Link>
            <span className="mr-cap-title">
              Recording <strong>{section.name}</strong>
            </span>
          </div>
          <div className="mr-cap-topbar__right">
            {phase === "idle" && (
              <Button onClick={startRecording} size="md">
                Start recording
              </Button>
            )}
            {phase === "review" && (
              <>
                <Button variant="ghost" onClick={restart}>
                  Re-record
                </Button>
                <Button onClick={save} disabled={!thumbDataUrl}>
                  Save
                </Button>
              </>
            )}
            {phase === "done" && (
              <Link href={`/sections/${section.id}`} className="mr-cap-link-btn">
                View section →
              </Link>
            )}
          </div>
        </header>
      )}

      {/* ── Main stage ── */}
      <main className="mr-cap-main">
        {/* IDLE / COUNTDOWN / RECORDING — show the live section iframe */}
        {(phase === "idle" || phase === "countdown" || phase === "recording") && (
          <div ref={stageRef} className="mr-cap-stage" data-phase={phase}>
            <iframe
              ref={iframeRef}
              src={renderSrc}
              className="mr-cap-iframe"
              title={`${section.name} preview`}
              loading="eager"
            />
            {phase === "idle" && (
              <div className="mr-cap-helptext">
                Press <strong>Start recording</strong>. You&apos;ll get a 3-second countdown,
                then scroll and hover the section as you want it captured.
                Recording auto-stops after {HARD_CAP_S}s.
              </div>
            )}
            {phase === "recording" && hudVisible && (
              <div className="mr-cap-recbar">
                <span className="mr-cap-recdot" aria-hidden />
                <span className="mr-cap-rectime">
                  {formatTime(recordSeconds)} / {formatTime(HARD_CAP_S)}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="mr-cap-stopbtn"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fixed full-viewport countdown overlay — sits OUTSIDE the stage
            so the Chrome share-indicator bar doesn't clip it. */}
        {phase === "countdown" && countdown > 0 && (
          <div className="mr-cap-countdown-overlay" aria-live="polite">
            <div className="mr-cap-countdown-label">Recording starts in</div>
            <div className="mr-cap-countdown-num" key={countdown}>
              {countdown}
            </div>
          </div>
        )}

        {/* Esc-to-stop hint when the HUD is hidden (Region Capture
            unavailable / failed). */}
        {phase === "recording" && !hudVisible && (
          <div className="mr-cap-esc-hint">
            Press <kbd>Esc</kbd> to stop · auto-stops at {formatTime(HARD_CAP_S)}
          </div>
        )}

        {/* REVIEW — playback with inline trim handles on the timeline. */}
        {phase === "review" && recordedUrl && (
          <div className="mr-cap-review">
            <div
              className="mr-cap-player"
              onClick={(e) => {
                // Click the video frame itself = toggle play/pause.
                if ((e.target as HTMLElement).tagName === "VIDEO") togglePlay();
              }}
            >
              <video
                ref={reviewVideoRef}
                src={recordedUrl}
                onLoadedMetadata={onLoadedMetadata}
                playsInline
                muted
              />
              {!playing && (
                <button
                  type="button"
                  className="mr-cap-bigplay"
                  onClick={togglePlay}
                  aria-label="Play"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
                    <path d="M9 6l14 8-14 8z" fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>

            {/* Timeline strip — playhead + two trim handles + scrub region. */}
            <div className="mr-cap-tlrow">
              <button
                type="button"
                className="mr-cap-tlplay"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <rect x="3" y="2" width="3" height="10" fill="currentColor" />
                    <rect x="8" y="2" width="3" height="10" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M3 2l9 5-9 5z" fill="currentColor" />
                  </svg>
                )}
              </button>

              <div
                ref={timelineRef}
                className="mr-cap-tl"
                onPointerDown={(e) => {
                  // Click on the bar (not a handle) = scrub.
                  if ((e.target as HTMLElement).dataset.handle) return;
                  setDragging("scrub");
                  const t = timeFromClientX(e.clientX);
                  if (reviewVideoRef.current) reviewVideoRef.current.currentTime = t;
                }}
                style={{ cursor: "pointer" }}
              >
                {/* Selected (kept) range. */}
                <div
                  className="mr-cap-tl__range"
                  style={{
                    left: `${(trimIn / Math.max(duration, 0.0001)) * 100}%`,
                    right: `${100 - (trimOut / Math.max(duration, 0.0001)) * 100}%`,
                  }}
                />
                {/* Trimmed (discarded) regions — overlay grey. */}
                <div
                  className="mr-cap-tl__trimmed"
                  style={{ left: 0, width: `${(trimIn / Math.max(duration, 0.0001)) * 100}%` }}
                />
                <div
                  className="mr-cap-tl__trimmed"
                  style={{
                    right: 0,
                    width: `${100 - (trimOut / Math.max(duration, 0.0001)) * 100}%`,
                  }}
                />
                {/* Playhead. */}
                <div
                  className="mr-cap-tl__playhead"
                  style={{
                    left: `${(currentTime / Math.max(duration, 0.0001)) * 100}%`,
                  }}
                />
                {/* In handle. */}
                <button
                  type="button"
                  data-handle="in"
                  className="mr-cap-tl__handle mr-cap-tl__handle--in"
                  style={{ left: `${(trimIn / Math.max(duration, 0.0001)) * 100}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragging("in");
                  }}
                  aria-label={`Trim start at ${formatTime(trimIn)}`}
                />
                {/* Out handle. */}
                <button
                  type="button"
                  data-handle="out"
                  className="mr-cap-tl__handle mr-cap-tl__handle--out"
                  style={{ left: `${(trimOut / Math.max(duration, 0.0001)) * 100}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragging("out");
                  }}
                  aria-label={`Trim end at ${formatTime(trimOut)}`}
                />
              </div>

              <div className="mr-cap-tltime">
                <span className="mr-cap-tltime__cur">{formatTime(currentTime)}</span>
                <span className="mr-cap-tltime__sep">/</span>
                <span className="mr-cap-tltime__dur">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Below the timeline: trim summary + thumbnail picker + meta. */}
            <div className="mr-cap-tlfoot">
              <div className="mr-cap-tlfoot__summary">
                <strong>Trim:</strong> {formatTime(trimIn)} → {formatTime(trimOut)}
                <span className="mr-cap-tlfoot__dur">
                  ({Math.max(0, trimOut - trimIn).toFixed(1)}s)
                </span>
                {overBudgetSoft && (
                  <span className="mr-cap-tlfoot__warn">
                    raw {formatBytes(recordedBlob?.size ?? 0)} — trim shrinks it
                  </span>
                )}
              </div>
              <div className="mr-cap-tlfoot__thumb">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => grabThumb(currentTime)}
                >
                  {thumbDataUrl ? "Update thumbnail to this frame" : "Use this frame as thumbnail"}
                </Button>
                {thumbDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumbDataUrl} alt="Thumbnail preview" className="mr-cap-thumbprev" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* SAVING */}
        {phase === "saving" && (
          <div className="mr-cap-saving">
            <div className="mr-cap-spinner" aria-hidden />
            <h2>{savingStep || "Saving…"}</h2>
            <p>Don&apos;t close this tab. Video processing happens in your browser.</p>
          </div>
        )}

        {/* DONE — preview of what landed on Supabase + section.json */}
        {phase === "done" && savedSummary && (
          <div className="mr-cap-done">
            <div className="mr-cap-done__previews">
              <div className="mr-cap-done__preview">
                <div className="mr-cap-done__label">
                  Pre-rollover · <span>static thumbnail</span>
                </div>
                <div className="mr-cap-done__frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={savedSummary.thumbUrl} alt="Saved thumbnail" />
                </div>
              </div>
              <div className="mr-cap-done__preview">
                <div className="mr-cap-done__label">
                  On rollover · <span>video clip · {formatBytes(savedSummary.videoBytes)}</span>
                </div>
                <div className="mr-cap-done__frame">
                  <video
                    src={savedSummary.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                  />
                </div>
              </div>
            </div>

            <div className="mr-cap-done__actionsbar">
              <div className="mr-cap-done__statusrow">
                <div className="mr-cap-done__check" aria-hidden>✓</div>
                <div className="mr-cap-done__statustext">
                  Saved to Supabase &amp; <code>section.json</code>
                </div>
              </div>
              <div className="mr-cap-done__links">
                <Button variant="ghost" size="sm" onClick={restart}>
                  Re-record
                </Button>
                <Link href={`/sections/${section.id}`}>
                  <Button size="sm">View section</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* PERMISSION (transient, no UI beyond a hint) */}
        {phase === "permission" && (
          <div className="mr-cap-permission">
            <div className="mr-cap-spinner" aria-hidden />
            <h2>Choose this tab</h2>
            <p>Your browser will prompt you to share a tab. Pick this one.</p>
          </div>
        )}
      </main>

      {/* Errors float bottom-centre across phases. */}
      {error && (
        <div className="mr-cap-error" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
