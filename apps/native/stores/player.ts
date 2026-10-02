import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import { create } from "zustand";

import { getStreamCandidates } from "@/lib/api/playlist";
import { getStationByUuid, sendStationClick } from "@/lib/api/radio-browser";
import { LOCK_SCREEN_ARTWORK } from "@/lib/lock-screen-artwork";
import { backoffDelay } from "@/lib/playback/backoff";
import {
  classifyPlaybackError,
  isRetryable,
  recordingUnavailableError,
} from "@/lib/playback/errors";
import type { PlaybackError } from "@/lib/playback/errors";
import { recordingFileExists, recordingUri } from "@/lib/recording/recorder";
import type { Recording } from "@/lib/recording/types";
import { getJson, remove, setJson } from "@/lib/storage";
import type { Station } from "@/lib/types";
import { useNetwork } from "@/stores/network";
import { useRecents } from "@/stores/recents";

const LAST_STATION_KEY = "player.lastStation";

/**
 * The one authoritative playback state. Every surface — Mini Player, Now
 * Playing, Station Detail — reads this and nothing else.
 *
 *   idle          nothing loaded
 *   connecting    resolving the station and opening the stream
 *   buffering     stream is open, waiting for audio
 *   playing       audio is actually flowing
 *   paused        see `pauseReason`
 *   reconnecting  lost the stream, retrying
 *   stopped       released by the listener; the station stays for Resume
 *   error         gave up; see `error`
 */
export type PlaybackStatus =
  | "idle"
  | "connecting"
  | "buffering"
  | "playing"
  | "paused"
  | "reconnecting"
  | "stopped"
  | "error";

/**
 * Why a paused player is paused.
 *
 *   user      Pause was pressed in the app.
 *   external  The platform paused it: a call or other interruption, headphones
 *             or Bluetooth disconnecting, or Pause on the lock screen/headset.
 *             expo-audio reports all of these the same way, so they share one
 *             reason.
 */
export type PauseReason = "user" | "external";

/* ------------------------------------------------------------------------ *
 * Single-player invariant
 *
 * expo-audio players are native objects that outlive the JS that created
 * them. A player that is never released keeps decoding audio even after the
 * app is killed.
 *
 * Three rules enforced here:
 *   1. At most ONE player exists at any moment.
 *   2. Every player ever created is tracked, so nothing can be orphaned by a
 *      race, an exception, or a fast double-tap.
 *   3. Releasing pauses FIRST — `remove()` alone does not reliably silence a
 *      player before the native object is torn down.
 * ------------------------------------------------------------------------ */

let player: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;
let stallTimer: ReturnType<typeof setTimeout> | null = null;
let lockScreenTimer: ReturnType<typeof setTimeout> | null = null;

const LOCK_SCREEN_DELAY_MS = 400;

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let stableTimer: ReturnType<typeof setTimeout> | null = null;

/** Automatic reconnects made since audio was last stable. */
let attempt = 0;

/** Whether this station has produced audio since Play was pressed. */
let hasPlayed = false;

/**
 * A stream that was playing and dropped has earned patience. One that never
 * started is far more likely to be dead, so it gets a shorter leash before the
 * listener is told.
 */
const RETRY_BUDGET_AFTER_AUDIO = 5;
const RETRY_BUDGET_BEFORE_AUDIO = 2;

/**
 * Audio must hold this long before the retry budget refills. Refilling on the
 * first frame would let a stream that plays a second and dies retry forever.
 */
const STABLE_AFTER_MS = 10000;

/**
 * The station's streams, best first, and which one is in use. Index 0 is the
 * primary; anything after it is one of the broadcaster's own alternates.
 */
let candidates: string[] = [];
let candidateIndex = 0;

/** The stream address in use right now — what a recording should capture. */
export function getActiveStreamUrl(): string | null {
  return candidates[candidateIndex] ?? null;
}

/** Failures another address for the same station might get around. */
function worthTryingAnotherStream(kind: PlaybackError["kind"]): boolean {
  // Deliberately not region or login failures: an alternate stream must never
  // be used to step around a restriction the broadcaster put there.
  return kind === "stream_offline" || kind === "stale_url" || kind === "unknown";
}

/**
 * Set when the connection dropped mid-listen. Retrying on a timer while the
 * device is offline only burns the budget, so the reconnect waits for the
 * network to come back instead.
 */
let waitingForNetwork = false;

/**
 * How long a stream gets to actually start producing audio before it's
 * treated as failed. Without this, a station that connects but never reaches
 * `playing: true` — throttled, stuck buffering, a format the device silently
 * can't decode — would sit in Connecting forever with no error to show.
 */
const STALL_TIMEOUT_MS = 15000;

/**
 * Every player handed out by `createAudioPlayer`. Belt-and-braces: if a race
 * ever leaks one past `player`, `releaseAllPlayers()` still finds it.
 */
const livePlayers = new Set<AudioPlayer>();

/** Bumped on every connection attempt; a call whose token is stale must abort. */
let playToken = 0;

/**
 * Set when the loaded station came out of storage rather than a fresh
 * directory result. Its stream URL may have changed since it was saved, so
 * the first Play looks it up again before connecting.
 */
let needsRevalidation = false;

const REVALIDATE_TIMEOUT_MS = 4000;

/**
 * Whether the listener currently intends audio to be flowing. This is what
 * separates "the stream went quiet" (recover) from "they pressed pause"
 * (leave it alone).
 */
let wantsToPlay = false;

function hardRelease(target: AudioPlayer) {
  livePlayers.delete(target);
  // Order matters: silence, then detach lock screen, then free the object.
  try {
    target.pause();
  } catch {
    /* already gone */
  }
  try {
    target.setActiveForLockScreen(false);
  } catch {
    /* not the active player */
  }
  try {
    target.remove();
  } catch {
    /* already released */
  }
}

/**
 * Tears down the current player. Synchronous and re-entrancy safe: the module
 * reference is cleared BEFORE release, so a concurrent call can neither
 * double-release the same instance nor skip one.
 */
function clearStall() {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = null;
  }
}

function teardown() {
  clearStall();
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (stableTimer) {
    clearTimeout(stableTimer);
    stableTimer = null;
  }
  if (lockScreenTimer) {
    clearTimeout(lockScreenTimer);
    lockScreenTimer = null;
  }
  if (statusSub) {
    try {
      statusSub.remove();
    } catch {
      /* noop */
    }
    statusSub = null;
  }

  const current = player;
  player = null;
  if (current) hardRelease(current);
}

/**
 * Puts the station-supplied title on the lock screen and notification, or
 * takes it back off with null. Only has an effect while a player is bound to
 * the lock screen.
 */
export function updateLockScreenNowPlaying(station: Station, nowPlaying: string | null) {
  try {
    player?.updateLockScreenMetadata({
      title: station.name,
      artist: nowPlaying ?? "Aircircle",
      albumTitle: station.country || "Live radio",
      artworkUrl: LOCK_SCREEN_ARTWORK,
    });
  } catch {
    /* lock screen metadata is cosmetic */
  }
}

/**
 * Nuclear option — releases the tracked player and any leaked ones. Called on
 * root-layout teardown so a Fast Refresh or JS reload can't strand audio.
 */
export function releaseAllPlayers() {
  playToken++;
  wantsToPlay = false;
  attempt = 0;
  hasPlayed = false;
  waitingForNetwork = false;
  teardown();
  for (const stray of Array.from(livePlayers)) hardRelease(stray);
  livePlayers.clear();
}

type PlayerState = {
  station: Station | null;
  /**
   * Set when a saved recording is loaded instead of a live stream. Surfaces
   * read this to label playback RECORDED rather than LIVE and to hide
   * live-only actions.
   */
  recording: Recording | null;
  /** Seconds into the saved recording. Always 0 for live radio. */
  position: number;
  /**
   * Whether this session has produced audio since Play was pressed. Screens
   * use it to tell a first connection (show the Connecting state) from a
   * brief re-buffer of something already playing (don't).
   */
  hasAudio: boolean;
  /**
   * True while playing or trying one of the station's alternate streams
   * instead of its primary one. Screens say so, and offer the way back.
   */
  usingFallback: boolean;
  status: PlaybackStatus;
  pauseReason: PauseReason | null;
  error: PlaybackError | null;
  /** Which automatic reconnect is in progress; 0 when not reconnecting. */
  retryAttempt: number;
  /** Epoch ms of the next automatic reconnect, for a countdown. */
  retryAt: number | null;
  isReady: boolean;
};

type PlayerActions = {
  setup: () => Promise<void>;
  /**
   * Loads the last station from storage without starting it, so Home can
   * offer Resume. Nothing connects until the listener presses Play.
   */
  restore: () => void;
  play: (station: Station) => Promise<void>;
  /** Plays a saved recording through the same single player. Works offline. */
  playRecording: (recording: Recording) => Promise<void>;
  /** Saved recordings only — live radio has nothing to seek. */
  seekTo: (seconds: number) => void;
  pause: () => void;
  resume: () => Promise<void>;
  toggle: () => Promise<void>;
  /** Releases playback but keeps the station loaded so it can be resumed. */
  stop: () => void;
  /** Stops and unloads the station — the Mini Player goes away with it. */
  dismiss: () => void;
  /** "Retry now": reconnects immediately with a fresh retry budget. */
  retry: () => Promise<void>;
  /** Goes back to the station's primary stream after a fallback was used. */
  usePrimaryStream: () => Promise<void>;
  /** Called by the network recovery service; not for screens. */
  handleNetworkLost: () => void;
  handleNetworkRestored: () => void;
};

export const usePlayer = create<PlayerState & PlayerActions>((set, get) => {
  const fail = (reason: unknown) => {
    teardown();
    if (!wantsToPlay) return;

    // A local file that won't play is a broken file, not a station having a
    // bad day: nothing to reconnect to, so no retry.
    if (get().recording) {
      wantsToPlay = false;
      set({
        status: "error",
        error: recordingUnavailableError(reason),
        retryAttempt: 0,
        retryAt: null,
      });
      return;
    }

    const error = classifyPlaybackError(reason, useNetwork.getState().isConnected);
    const budget = hasPlayed ? RETRY_BUDGET_AFTER_AUDIO : RETRY_BUDGET_BEFORE_AUDIO;

    // The stream never started, and the station has another one: try that
    // before spending retries on an address that may simply be dead. It is
    // the same station either way, and the screen says a fallback is in use.
    if (
      !hasPlayed &&
      worthTryingAnotherStream(error.kind) &&
      candidateIndex < candidates.length - 1
    ) {
      candidateIndex++;
      set({ usingFallback: true });
      void connect();
      return;
    }

    // Lost the connection while listening: hold the station and pick it back
    // up when the network returns. Pressing Play while already offline is not
    // this case — that fails outright so the listener knows why.
    if (error.kind === "offline" && hasPlayed) {
      waitingForNetwork = true;
      set({ status: "reconnecting", error, retryAttempt: 0, retryAt: null });
      return;
    }

    if (isRetryable(error.kind) && attempt < budget) {
      const delay = backoffDelay(attempt);
      attempt++;
      set({ status: "reconnecting", error, retryAttempt: attempt, retryAt: Date.now() + delay });
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
      return;
    }

    // Budget spent, or a failure retrying can't fix. Terminal: nothing more
    // happens until the listener chooses Retry, another station, or Stop.
    wantsToPlay = false;
    attempt = 0;
    hasPlayed = false;
    // The next Retry starts again from the primary stream.
    candidateIndex = 0;
    set({
      status: "error",
      error,
      retryAttempt: 0,
      retryAt: null,
      hasAudio: false,
      usingFallback: false,
    });
  };

  /** If audio isn't flowing by the deadline and no error ever fired, fail anyway. */
  const armStall = () => {
    clearStall();
    const token = playToken;
    stallTimer = setTimeout(() => {
      if (token !== playToken || !wantsToPlay) return;
      if (get().status !== "playing") fail("Timed out waiting for audio");
    }, STALL_TIMEOUT_MS);
  };

  const onStatus = (status: AudioStatus) => {
    if (status.error) {
      fail(status.error);
      return;
    }

    if (status.playing) {
      clearStall();
      wantsToPlay = true;
      hasPlayed = true;
      if (get().status !== "playing") {
        set({
          status: "playing",
          pauseReason: null,
          error: null,
          retryAttempt: 0,
          retryAt: null,
          hasAudio: true,
        });
        if (!stableTimer) {
          stableTimer = setTimeout(() => {
            stableTimer = null;
            attempt = 0;
          }, STABLE_AFTER_MS);
        }
      }
      if (get().recording) {
        const position = Math.floor(status.currentTime);
        if (position !== get().position) set({ position });
      }
      return;
    }

    // A saved recording reaching its end is just the end.
    if (status.didJustFinish && get().recording) {
      releaseAllPlayers();
      set({ status: "stopped", pauseReason: null, error: null, position: 0 });
      return;
    }

    // A live stream has no end; reaching one means the broadcaster cut it.
    if (status.didJustFinish) {
      fail("Stream ended");
      return;
    }

    if (!wantsToPlay) return;

    // Audio stopped flowing, so it is no longer on its way to being stable.
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }

    if (status.isLoaded && !status.isBuffering) {
      // Loaded, not buffering, not playing, and we never asked for that: the
      // platform paused it. Stay paused until the listener (or the platform
      // itself) starts it again — never resume behind their back.
      if (get().status === "playing") {
        wantsToPlay = false;
        set({ status: "paused", pauseReason: "external" });
      }
      return;
    }

    // Dropping out of playing into buffering gets the same deadline as a
    // first connect — a stream can stall mid-broadcast without ever erroring.
    if (get().status === "playing" && !get().recording) armStall();

    // Mid-reconnect the listener is told "Reconnecting" until audio returns,
    // not walked back through Connecting and Buffering.
    const next = attempt > 0 ? "reconnecting" : status.isLoaded ? "buffering" : "connecting";
    if (get().status !== next) set({ status: next });
  };

  /** Opens the stream for the loaded station. The only place a player is created. */
  const connect = async () => {
    const station = get().station;
    if (!station) return;

    // Claim this attempt. Any connect() already in flight is now stale.
    const token = ++playToken;

    // Synchronous, before any await — this is what stops stacking.
    teardown();
    waitingForNetwork = false;

    if (attempt > 0) set({ status: "reconnecting", pauseReason: null, retryAt: null });
    else set({ status: "connecting", pauseReason: null, error: null, retryAttempt: 0, retryAt: null });

    const recording = get().recording;

    // Saved recordings play from disk — no network needed.
    if (!recording && !useNetwork.getState().isConnected) {
      fail("No network connection");
      return;
    }

    try {
      let streamUrl: string;
      if (recording) {
        const exists = await recordingFileExists(recording.fileName);
        if (token !== playToken) return;
        if (!exists) {
          fail("Recording file is missing");
          return;
        }
        streamUrl = recordingUri(recording.fileName);
      } else {
        if (candidates.length === 0) candidates = await getStreamCandidates(station);
        streamUrl = candidates[Math.min(candidateIndex, candidates.length - 1)];
      }

      // A newer attempt started while we were resolving the URL — bail
      // before ever touching the native player.
      if (token !== playToken) return;

      const next = createAudioPlayer({ uri: streamUrl });
      livePlayers.add(next);
      player = next;

      statusSub = next.addListener("playbackStatusUpdate", (status) => {
        if (token !== playToken) return;
        onStatus(status);
      });

      next.play();
      if (!recording) armStall();

      // Binds this player to the lock screen, notification and headset
      // controls. On Android this is also what keeps background playback
      // alive past a few minutes.
      lockScreenTimer = setTimeout(() => {
        if (token !== playToken) return;
        try {
          next.setActiveForLockScreen(
            true,
            {
              title: station.name,
              artist: "Aircircle",
              albumTitle: recording ? "Saved recording" : station.country || "Live radio",
              artworkUrl: LOCK_SCREEN_ARTWORK,
            },
            // Live radio: no scrub bar, no skip buttons.
            recording
              ? { isLiveStream: false, showSeekForward: true, showSeekBackward: true }
              : { isLiveStream: true, showSeekForward: false, showSeekBackward: false },
          );
        } catch {
          /* lock screen metadata is cosmetic */
        }
      }, LOCK_SCREEN_DELAY_MS);
    } catch (e) {
      if (token !== playToken) return;
      fail(e);
    }
  };

  return {
    station: null,
    recording: null,
    position: 0,
    hasAudio: false,
    usingFallback: false,
    status: "idle",
    pauseReason: null,
    error: null,
    retryAttempt: 0,
    retryAt: null,
    isReady: false,

    setup: async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          // Required for lock screen controls to bind to this player.
          interruptionMode: "doNotMix",
        });
      } catch {
        /* playback still works in the foreground without it */
      }
      set({ isReady: true });
    },

    restore: () => {
      // Never overwrite something already loaded — this is launch-time
      // hydration, and losing a race with a real Play would be silent.
      if (get().station) return;
      const last = getJson<Station>(LAST_STATION_KEY);
      if (last?.stationuuid && last.url) {
        needsRevalidation = true;
        set({ station: last, status: "stopped" });
      }
    },

    play: async (station: Station) => {
      const { station: current, status, recording } = get();

      // Repeated taps on a station that is already starting or playing must
      // not restart the stream.
      const isActive = status === "connecting" || status === "buffering" || status === "playing";
      if (isActive && !recording && current?.stationuuid === station.stationuuid) return;

      wantsToPlay = true;
      attempt = 0;
      hasPlayed = false;
      needsRevalidation = false;
      candidates = [];
      candidateIndex = 0;
      set({ station, recording: null, position: 0, hasAudio: false, usingFallback: false });

      // Recorded per Play press, not per connection, so automatic reconnects
      // neither reshuffle Recents nor inflate the station's click count.
      setJson(LAST_STATION_KEY, station);
      useRecents.getState().add(station);
      sendStationClick(station.stationuuid).catch(() => {});

      await connect();
    },

    playRecording: async (recording: Recording) => {
      const { recording: current, status } = get();
      const isActive = status === "connecting" || status === "buffering" || status === "playing";
      if (isActive && current?.id === recording.id) return;

      wantsToPlay = true;
      attempt = 0;
      hasPlayed = false;

      // Deliberately not written to Recents or the last station: a saved file
      // is not a station the listener tuned to.
      set({
        station: {
          stationuuid: recording.stationUuid,
          name: recording.stationName,
          url: recordingUri(recording.fileName),
        },
        recording,
        position: 0,
        hasAudio: false,
        usingFallback: false,
      });
      candidates = [];
      candidateIndex = 0;

      await connect();
    },

    seekTo: (seconds: number) => {
      if (!player || !get().recording) return;
      const position = Math.max(0, seconds);
      player.seekTo(position).catch(() => {});
      set({ position: Math.floor(position) });
    },

    pause: () => {
      const { station, status } = get();
      const isInactive =
        status === "idle" || status === "paused" || status === "stopped" || status === "error";
      if (!station || isInactive) return;

      wantsToPlay = false;
      waitingForNetwork = false;
      // An intentional pause is a valid reason for audio not to be flowing.
      clearStall();

      if (status === "playing" || status === "buffering") {
        try {
          player?.pause();
        } catch {
          /* noop */
        }
      } else {
        // Still connecting: there is no audio to hold, so drop the attempt
        // rather than let it start playing after Pause was pressed.
        playToken++;
        teardown();
      }

      set({ status: "paused", pauseReason: "user", error: null, retryAttempt: 0, retryAt: null });
    },

    resume: async () => {
      const { station, status } = get();
      if (!station || status === "playing") return;

      wantsToPlay = true;
      attempt = 0;

      if (needsRevalidation && !get().recording) {
        needsRevalidation = false;

        // Claims the token so Pause or Stop during the lookup cancels it.
        const token = ++playToken;
        set({ status: "connecting", pauseReason: null, error: null });

        // Best effort and time-boxed: if the directory is slow or down, the
        // saved copy is still the best guess and playback goes ahead with it.
        const fresh = await Promise.race([
          getStationByUuid(station.stationuuid).catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), REVALIDATE_TIMEOUT_MS)),
        ]);
        if (token !== playToken) return;

        if (fresh) {
          set({ station: fresh });
          setJson(LAST_STATION_KEY, fresh);
        }
      }

      // Without a live player there is nothing to un-pause — reconnect from
      // scratch. The same goes for one that errored: the native object may
      // still exist but its connection is dead.
      if (!player || status !== "paused") {
        await connect();
        return;
      }

      set({ status: "buffering", pauseReason: null, error: null });
      try {
        player.play();
        if (!get().recording) armStall();
      } catch {
        await connect();
      }
    },

    toggle: async () => {
      const { status } = get();
      const isActive =
        status === "playing" ||
        status === "connecting" ||
        status === "buffering" ||
        status === "reconnecting";
      if (isActive) get().pause();
      else await get().resume();
    },

    stop: () => {
      // Also invalidates any in-flight connect() so it can't resurrect audio.
      releaseAllPlayers();
      if (!get().station) return;
      set({
        status: "stopped",
        pauseReason: null,
        error: null,
        retryAttempt: 0,
        retryAt: null,
        position: 0,
        hasAudio: false,
      });
    },

    dismiss: () => {
      releaseAllPlayers();
      // Dismissing a saved recording must not forget the last live station.
      if (!get().recording) remove(LAST_STATION_KEY);
      set({
        station: null,
        recording: null,
        position: 0,
        hasAudio: false,
        usingFallback: false,
        status: "idle",
        pauseReason: null,
        error: null,
        retryAttempt: 0,
        retryAt: null,
      });
    },

    retry: async () => {
      if (!get().station) return;
      wantsToPlay = true;
      attempt = 0;
      await connect();
    },

    usePrimaryStream: async () => {
      if (!get().station || get().recording) return;
      wantsToPlay = true;
      attempt = 0;
      hasPlayed = false;
      candidateIndex = 0;
      set({ usingFallback: false, hasAudio: false });
      await connect();
    },

    handleNetworkLost: () => {
      if (!wantsToPlay || waitingForNetwork || get().recording) return;
      playToken++;
      fail("Network connection lost");
    },

    handleNetworkRestored: () => {
      // Only picks up a session the network itself interrupted. If the
      // listener paused or stopped, connectivity returning must not start
      // audio behind their back.
      if (!waitingForNetwork || !wantsToPlay) return;
      void connect();
    },
  };
});
