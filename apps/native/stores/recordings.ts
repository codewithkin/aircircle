import { create } from "zustand";

import { canRecord } from "@/lib/recording/eligibility";
import {
  CaptureError,
  MAX_RECORDING_MS,
  abortCapture,
  beginCapture,
  deleteRecordingFile,
  endCapture,
  hasSpaceToContinue,
} from "@/lib/recording/recorder";
import type { Recording, RecordingFailure } from "@/lib/recording/types";
import { getJson, remove, setJson } from "@/lib/storage";
import { getActiveStreamUrl } from "@/stores/player";
import type { Station } from "@/lib/types";

const RECORDINGS_KEY = "recordings.list";

/** How often a running recording checks that the device still has room. */
const SPACE_CHECK_INTERVAL_MS = 30_000;

let limitTimer: ReturnType<typeof setTimeout> | null = null;
let spaceTimer: ReturnType<typeof setInterval> | null = null;

function clearTimers() {
  if (limitTimer) {
    clearTimeout(limitTimer);
    limitTimer = null;
  }
  if (spaceTimer) {
    clearInterval(spaceTimer);
    spaceTimer = null;
  }
}

type RecordingsState = {
  /** Newest first. */
  recordings: Recording[];
  /** The recording in progress, if any. Elapsed time is `Date.now() - startedAt`. */
  active: { station: Station; startedAt: number } | null;
  /** True between the Record tap and bytes being written. */
  isStarting: boolean;
  /** Why the last attempt failed or ended early. */
  failure: RecordingFailure | null;
  /** The recording that was just saved, for the "Recording saved" confirmation. */
  lastSaved: Recording | null;
};

type RecordingsActions = {
  /** Only ever called from an explicit Record tap. Resolves true once recording. */
  start: (station: Station) => Promise<boolean>;
  /** Stops and saves. Returns the saved recording, or null if nothing was captured. */
  stop: () => Promise<Recording | null>;
  remove: (id: string) => void;
  clearAll: () => void;
  restore: () => void;
  /** Dismisses the saved confirmation or failure message. */
  acknowledge: () => void;
};

export const useRecordings = create<RecordingsState & RecordingsActions>((set, get) => {
  const commit = (recordings: Recording[]) => {
    setJson(RECORDINGS_KEY, recordings);
    set({ recordings });
  };

  return {
    recordings: [],
    active: null,
    isStarting: false,
    failure: null,
    lastSaved: null,

    start: async (station: Station) => {
      if (get().active) return true;
      if (get().isStarting) return false;

      if (!canRecord(station)) {
        set({ failure: "not-eligible" });
        return false;
      }

      set({ isStarting: true, failure: null, lastSaved: null });

      try {
        // Capture the stream that is actually playing, fallback or not.
        const { startedAt } = await beginCapture(station, getActiveStreamUrl(), (reason) => {
          clearTimers();
          set({ active: null, failure: reason });
        });

        set({ active: { station, startedAt }, isStarting: false });

        limitTimer = setTimeout(() => void get().stop(), MAX_RECORDING_MS);
        spaceTimer = setInterval(() => {
          hasSpaceToContinue()
            .then((ok) => {
              if (ok || !get().active) return;
              // Save what there is while it can still be saved.
              void get()
                .stop()
                .then(() => set({ failure: "no-space" }));
            })
            .catch(() => {});
        }, SPACE_CHECK_INTERVAL_MS);

        return true;
      } catch (e) {
        const failure: RecordingFailure = e instanceof CaptureError ? e.reason : "network";
        set({ active: null, isStarting: false, failure });
        return false;
      }
    },

    stop: async () => {
      if (!get().active) return null;

      clearTimers();
      set({ active: null });

      const result = await endCapture();
      if (!result) {
        set({ failure: "no-data" });
        return null;
      }

      const recording: Recording = {
        // The file is already named with a unique id; reuse it so the list
        // entry and the bytes on disk can always be matched up.
        id: result.fileName.replace(/\.[^.]+$/, ""),
        stationName: result.station.name,
        stationUuid: result.station.stationuuid,
        fileName: result.fileName,
        durationMs: result.durationMs,
        sizeBytes: result.bytes,
        recordedAt: Date.now(),
      };

      commit([recording, ...get().recordings]);
      set({ lastSaved: recording });
      return recording;
    },

    remove: (id: string) => {
      const target = get().recordings.find((r) => r.id === id);
      commit(get().recordings.filter((r) => r.id !== id));

      // Drop the audio too. The list entry is the only handle the listener has
      // on the file, so leaving the bytes behind would orphan them forever.
      if (target) void deleteRecordingFile(target.fileName).catch(() => {});
    },

    clearAll: () => {
      clearTimers();
      void abortCapture().catch(() => {});

      for (const r of get().recordings) void deleteRecordingFile(r.fileName).catch(() => {});
      remove(RECORDINGS_KEY);
      set({ recordings: [], active: null, isStarting: false, failure: null, lastSaved: null });
    },

    restore: () => {
      const list = getJson<Recording[]>(RECORDINGS_KEY);
      if (Array.isArray(list)) set({ recordings: list });
    },

    acknowledge: () => set({ failure: null, lastSaved: null }),
  };
});

/** Approximate storage used by all saved recordings, in bytes. */
export function totalRecordingBytes(recordings: Recording[]): number {
  return recordings.reduce((sum, r) => sum + r.sizeBytes, 0);
}
