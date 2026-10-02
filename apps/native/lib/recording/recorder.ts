import * as FileSystem from "expo-file-system/legacy";

import { getPlayableStreamUrl } from "@/lib/api/playlist";
import type { RecordingFailure } from "@/lib/recording/types";
import type { Station } from "@/lib/types";

/**
 * Capturing a live radio stream to a file on the device.
 *
 * ## Why this is a second HTTP read and not a second player
 *
 * At most one native audio player exists at any moment. Recording must not
 * break that, so the recorder is not a player at all: it opens its own HTTP
 * read of the same stream URL and writes the bytes to disk. Playback is
 * untouched and keeps running through the whole recording.
 *
 * The microphone route was rejected deliberately: it captures whatever the room
 * is doing, needs a permission the app never asks for, and records silence
 * whenever the phone is on headphones.
 *
 * ## Why `createDownloadResumable` and not `fetch`
 *
 * React Native's `fetch` has no streaming response body — it buffers the whole
 * response before resolving. A live radio stream never ends, so that buffer
 * grows until the app dies. `createDownloadResumable` is backed by the
 * platform's own download machinery, writes to the destination file as bytes
 * arrive, and reports progress. Its `downloadAsync()` promise simply never
 * settles for an endless stream, which is why nothing here awaits it.
 *
 * Stopping is `pauseAsync()`, not `cancelAsync()`: cancel deletes the partial
 * file, and the partial file is the entire point.
 *
 * ## What comes out
 *
 * A byte-for-byte slice of the broadcast. MP3, AAC and Ogg streams are all
 * self-framing — a player can start decoding from any frame boundary — so a
 * partial capture is a valid, playable file. Its container has no duration
 * header, so some players show the length as unknown; we record the elapsed
 * time ourselves and store it alongside.
 */

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;

/** The ceiling that stops a forgotten recording eating the disk. */
export const MAX_RECORDING_MS = 60 * 60 * 1000;

/** Refuse to start with less headroom than this. ~50MB is over an hour at 128kbps. */
const MIN_FREE_BYTES_TO_START = 50 * 1024 * 1024;

/** Stop a running recording once free space falls to this, while it can still be saved. */
const MIN_FREE_BYTES_TO_CONTINUE = 10 * 1024 * 1024;

/** If not a single byte has landed by now, the stream is not going to give us one. */
const FIRST_BYTE_TIMEOUT_MS = 15_000;

export class CaptureError extends Error {
  constructor(
    readonly reason: RecordingFailure,
    message: string,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}

type ActiveCapture = {
  task: FileSystem.DownloadResumable;
  fileName: string;
  uri: string;
  station: Station;
  startedAt: number;
  bytes: number;
  firstByteTimer: ReturnType<typeof setTimeout> | null;
};

let active: ActiveCapture | null = null;

/** Full path of a saved recording, resolved against today's app container. */
export function recordingUri(fileName: string): string {
  return `${RECORDINGS_DIR}${fileName}`;
}

/** Bytes written so far. 0 when nothing is being captured. */
export function capturedBytes(): number {
  return active?.bytes ?? 0;
}

/**
 * HLS is a manifest of segment URLs, not a continuous byte stream. Downloading
 * it yields a few hundred bytes of text that no player will ever play. Detect
 * and refuse rather than write a file that is quietly garbage.
 */
function isSegmentedStream(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || /[?&]type=hls/i.test(url);
}

/** Container extension for a codec, so the OS and the player both guess right. */
function extensionFor(codec: string | undefined): string {
  const c = (codec ?? "").toLowerCase();
  if (c.includes("aac")) return "aac";
  if (c.includes("ogg") || c.includes("vorbis") || c.includes("opus")) return "ogg";
  if (c.includes("flac")) return "flac";
  return "mp3";
}

async function ensureDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

/** Free space on the device, in bytes. */
export function freeDiskBytes(): Promise<number> {
  return FileSystem.getFreeDiskStorageAsync();
}

/** Whether there is still room to keep writing a recording that is under way. */
export async function hasSpaceToContinue(): Promise<boolean> {
  return (await FileSystem.getFreeDiskStorageAsync()) >= MIN_FREE_BYTES_TO_CONTINUE;
}

/**
 * Start capturing. Resolves once the capture is running, or throws
 * `CaptureError`.
 *
 * `onFailure` fires if the stream connects but never delivers a byte — the
 * capture has already been thrown away by the time it is called.
 */
export async function beginCapture(
  station: Station,
  /** The stream to capture. Falls back to the station's primary stream. */
  activeUrl: string | null,
  onFailure?: (reason: RecordingFailure) => void,
): Promise<{ startedAt: number }> {
  if (active) await abortCapture();

  let streamUrl: string;
  try {
    streamUrl = activeUrl ?? (await getPlayableStreamUrl(station));
  } catch {
    throw new CaptureError("network", "Could not resolve the stream URL");
  }

  if (isSegmentedStream(streamUrl)) {
    throw new CaptureError(
      "unsupported-stream",
      "This station streams in segments (HLS), which cannot be saved as one file",
    );
  }

  const free = await FileSystem.getFreeDiskStorageAsync();
  if (free < MIN_FREE_BYTES_TO_START) {
    throw new CaptureError("no-space", "Not enough free space to record");
  }

  await ensureDirectory();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${id}.${extensionFor(station.codec)}`;
  const uri = recordingUri(fileName);
  const startedAt = Date.now();

  const task = FileSystem.createDownloadResumable(streamUrl, uri, {}, (progress) => {
    if (!active || active.uri !== uri) return;

    active.bytes = progress.totalBytesWritten;

    if (active.firstByteTimer && progress.totalBytesWritten > 0) {
      clearTimeout(active.firstByteTimer);
      active.firstByteTimer = null;
    }
  });

  active = { task, fileName, uri, station, startedAt, bytes: 0, firstByteTimer: null };

  // Never awaited: for a live stream this promise does not settle until the
  // broadcast ends or we pause it. The catch is here so a dropped connection
  // does not surface as an unhandled rejection.
  void task.downloadAsync().catch(() => {});

  active.firstByteTimer = setTimeout(() => {
    if (active?.uri === uri && active.bytes === 0) {
      void abortCapture().then(() => onFailure?.("no-data"));
    }
  }, FIRST_BYTE_TIMEOUT_MS);

  return { startedAt };
}

/**
 * Stop capturing and keep what was captured.
 *
 * Returns null when nothing usable landed — the file is deleted in that case
 * rather than left as a zero-byte recording the listener has to work out how
 * to remove.
 */
export async function endCapture(): Promise<{
  fileName: string;
  station: Station;
  durationMs: number;
  bytes: number;
} | null> {
  const capture = active;
  if (!capture) return null;
  active = null;

  if (capture.firstByteTimer) clearTimeout(capture.firstByteTimer);

  try {
    // pause, not cancel — cancel deletes the partial file, which is the record.
    await capture.task.pauseAsync();
  } catch {
    /* the transfer had already ended; the bytes on disk are still ours */
  }

  const info = await FileSystem.getInfoAsync(capture.uri);
  const bytes = info.exists && !info.isDirectory ? info.size : 0;

  if (!info.exists || bytes === 0) {
    await FileSystem.deleteAsync(capture.uri, { idempotent: true });
    return null;
  }

  return {
    fileName: capture.fileName,
    station: capture.station,
    durationMs: Date.now() - capture.startedAt,
    bytes,
  };
}

/** Stop and throw away. Used when the stream never delivered anything. */
export async function abortCapture(): Promise<void> {
  const capture = active;
  if (!capture) return;
  active = null;

  if (capture.firstByteTimer) clearTimeout(capture.firstByteTimer);

  try {
    await capture.task.cancelAsync();
  } catch {
    /* already gone */
  }
  await FileSystem.deleteAsync(capture.uri, { idempotent: true });
}

/** Remove a saved recording's file from disk. */
export async function deleteRecordingFile(fileName: string): Promise<void> {
  await FileSystem.deleteAsync(recordingUri(fileName), { idempotent: true });
}

/** Whether a saved recording's file is still on disk and has content. */
export async function recordingFileExists(fileName: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(recordingUri(fileName));
  return info.exists && !info.isDirectory && info.size > 0;
}
