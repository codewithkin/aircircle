import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import { create } from "zustand";

import { getPlayableStreamUrl } from "@/lib/api/playlist";
import { classifyPlaybackError } from "@/lib/playback/errors";
import type { PlaybackError } from "@/lib/playback/errors";
import type { Station } from "@/lib/types";
import { useNetwork } from "@/stores/network";

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
  // Order matters: silence, then free the object.
  try {
    target.pause();
  } catch {
    /* already gone */
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
function teardown() {
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
  teardown();
  for (const stray of Array.from(livePlayers)) hardRelease(stray);
  livePlayers.clear();
}

type PlayerState = {
  station: Station | null;
  status: PlaybackStatus;
  pauseReason: PauseReason | null;
  error: PlaybackError | null;
  isReady: boolean;
};

type PlayerActions = {
  setup: () => Promise<void>;
  play: (station: Station) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  toggle: () => Promise<void>;
  /** Releases playback but keeps the station loaded so it can be resumed. */
  stop: () => void;
  /** Stops and unloads the station — the Mini Player goes away with it. */
  dismiss: () => void;
};

export const usePlayer = create<PlayerState & PlayerActions>((set, get) => {
  const fail = (reason: unknown) => {
    teardown();
    if (!wantsToPlay) return;

    wantsToPlay = false;
    set({
      status: "error",
      error: classifyPlaybackError(reason, useNetwork.getState().isConnected),
    });
  };

  const onStatus = (status: AudioStatus) => {
    if (status.error) {
      fail(status.error);
      return;
    }

    if (status.playing) {
      wantsToPlay = true;
      if (get().status !== "playing") set({ status: "playing", pauseReason: null, error: null });
      return;
    }

    // A live stream has no end; reaching one means the broadcaster cut it.
    if (status.didJustFinish) {
      fail("Stream ended");
      return;
    }

    if (!wantsToPlay) return;

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

    set({ status: "connecting", pauseReason: null, error: null });

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

    play: async (station: Station) => {
      const { station: current, status } = get();

      // Repeated taps on a station that is already starting or playing must
      // not restart the stream.
      const isActive = status === "connecting" || status === "buffering" || status === "playing";
      if (isActive && current?.stationuuid === station.stationuuid) return;

      wantsToPlay = true;
      set({ station });
      await connect();
    },

    pause: () => {
      const { station, status } = get();
      if (!station || status === "idle" || status === "stopped" || status === "error") return;

      wantsToPlay = false;

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

      set({ status: "paused", pauseReason: "user" });
    },

    resume: async () => {
      const { station, status } = get();
      if (!station || status === "playing") return;

      wantsToPlay = true;

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
      } catch {
        await connect();
      }
    },

    toggle: async () => {
      const { status } = get();
      if (status === "playing" || status === "connecting" || status === "buffering") get().pause();
      else await get().resume();
    },

    stop: () => {
      // Also invalidates any in-flight connect() so it can't resurrect audio.
      releaseAllPlayers();
      if (!get().station) return;
      set({ status: "stopped", pauseReason: null, error: null });
    },

    dismiss: () => {
      releaseAllPlayers();
      set({ station: null, status: "idle", pauseReason: null, error: null });
    },
  };
});
