import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import { create } from "zustand";

import { getPlayableStreamUrl } from "@/lib/api/playlist";
import { sendStationClick } from "@/lib/api/radio-browser";
import { LOCK_SCREEN_ARTWORK } from "@/lib/lock-screen-artwork";
import { backoffDelay } from "@/lib/playback/backoff";
import { classifyPlaybackError, isRetryable } from "@/lib/playback/errors";
import type { PlaybackError } from "@/lib/playback/errors";
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
 * Nuclear option — releases the tracked player and any leaked ones. Called on
 * root-layout teardown so a Fast Refresh or JS reload can't strand audio.
 */
export function releaseAllPlayers() {
  playToken++;
  wantsToPlay = false;
  attempt = 0;
  waitingForNetwork = false;
  teardown();
  for (const stray of Array.from(livePlayers)) hardRelease(stray);
  livePlayers.clear();
}

type PlayerState = {
  station: Station | null;
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
  pause: () => void;
  resume: () => Promise<void>;
  toggle: () => Promise<void>;
  /** Releases playback but keeps the station loaded so it can be resumed. */
  stop: () => void;
  /** Stops and unloads the station — the Mini Player goes away with it. */
  dismiss: () => void;
  /** "Retry now": reconnects immediately with a fresh retry budget. */
  retry: () => Promise<void>;
  /** Called by the network recovery service; not for screens. */
  handleNetworkLost: () => void;
  handleNetworkRestored: () => void;
};

export const usePlayer = create<PlayerState & PlayerActions>((set, get) => {
  const fail = (reason: unknown) => {
    teardown();
    if (!wantsToPlay) return;

    const error = classifyPlaybackError(reason, useNetwork.getState().isConnected);
    const budget = hasPlayed ? RETRY_BUDGET_AFTER_AUDIO : RETRY_BUDGET_BEFORE_AUDIO;

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
    set({ status: "error", error, retryAttempt: 0, retryAt: null });
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
        set({ status: "playing", pauseReason: null, error: null, retryAttempt: 0, retryAt: null });
        if (!stableTimer) {
          stableTimer = setTimeout(() => {
            stableTimer = null;
            attempt = 0;
          }, STABLE_AFTER_MS);
        }
      }
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
    if (get().status === "playing") armStall();

    // Mid-reconnect the listener is told "Reconnecting" until audio returns,
    // not walked back through Connecting and Buffering.
    if (attempt > 0) return;

    const next = status.isLoaded ? "buffering" : "connecting";
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

    if (!useNetwork.getState().isConnected) {
      fail("No network connection");
      return;
    }

    try {
      const streamUrl = await getPlayableStreamUrl(station);

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
      armStall();

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
              artist: "AirCircle",
              albumTitle: station.country || "Live radio",
              artworkUrl: LOCK_SCREEN_ARTWORK,
            },
            // Live radio: no scrub bar, no skip buttons.
            { isLiveStream: true, showSeekForward: false, showSeekBackward: false },
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
      if (last?.stationuuid && last.url) set({ station: last, status: "stopped" });
    },

    play: async (station: Station) => {
      const { station: current, status } = get();

      // Repeated taps on a station that is already starting or playing must
      // not restart the stream.
      const isActive = status === "connecting" || status === "buffering" || status === "playing";
      if (isActive && current?.stationuuid === station.stationuuid) return;

      wantsToPlay = true;
      attempt = 0;
      hasPlayed = false;
      set({ station });

      // Recorded per Play press, not per connection, so automatic reconnects
      // neither reshuffle Recents nor inflate the station's click count.
      setJson(LAST_STATION_KEY, station);
      useRecents.getState().add(station);
      sendStationClick(station.stationuuid).catch(() => {});

      await connect();
    },

    pause: () => {
      const { station, status } = get();
      if (!station || status === "idle" || status === "stopped" || status === "error") return;

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
        armStall();
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
      set({ status: "stopped", pauseReason: null, error: null, retryAttempt: 0, retryAt: null });
    },

    dismiss: () => {
      releaseAllPlayers();
      remove(LAST_STATION_KEY);
      set({
        station: null,
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

    handleNetworkLost: () => {
      if (!wantsToPlay || waitingForNetwork) return;
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
