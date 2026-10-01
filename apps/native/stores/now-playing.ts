import { create } from "zustand";

import { getPlayableStreamUrl } from "@/lib/api/playlist";
import { fetchIcyTitle } from "@/lib/metadata/icy";
import type { Station } from "@/lib/types";
import { updateLockScreenNowPlaying, usePlayer } from "@/stores/player";

/** How often the title is refreshed while a station is playing. */
const POLL_INTERVAL_MS = 30_000;

/**
 * A title older than this is dropped rather than shown as current. Two missed
 * polls: one failure is a blip, two means we no longer know what's on.
 */
const STALE_AFTER_MS = 75_000;

type NowPlayingState = {
  /** The station-supplied title, typically "Artist - Song". Null when unknown. */
  title: string | null;
  /** `title` split on " - " when it has that shape; null otherwise. */
  artist: string | null;
  song: string | null;
  /** Epoch ms the title was last confirmed. Internal freshness, not for display. */
  fetchedAt: number | null;
};

const EMPTY: NowPlayingState = { title: null, artist: null, song: null, fetchedAt: null };

export const useNowPlaying = create<NowPlayingState>(() => EMPTY);

function splitTitle(title: string): { artist: string | null; song: string | null } {
  const at = title.indexOf(" - ");
  if (at <= 0) return { artist: null, song: null };
  return { artist: title.slice(0, at).trim(), song: title.slice(at + 3).trim() };
}

function isSegmentedStream(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url);
}

/**
 * Keeps `useNowPlaying` in step with the player: polls while a live station is
 * actually playing, and clears the moment it isn't, so a title is never left
 * on screen describing audio that has stopped or changed.
 */
export function startNowPlayingService(): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  /** The station being polled; also the token that invalidates stale replies. */
  let polling: Station | null = null;

  const clear = (station: Station | null) => {
    if (useNowPlaying.getState().fetchedAt === null && useNowPlaying.getState().title === null) return;
    useNowPlaying.setState(EMPTY);
    if (station) updateLockScreenNowPlaying(station, null);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    const station = polling;
    polling = null;
    clear(station);
  };

  const poll = async (station: Station) => {
    const url = await getPlayableStreamUrl(station).catch(() => null);
    if (polling !== station) return;

    // HLS carries no ICY metadata — nothing to ask for.
    if (!url || isSegmentedStream(url)) {
      stop();
      return;
    }

    const result = await fetchIcyTitle(url);
    if (polling !== station) return;

    if (!result.supported) {
      stop();
      return;
    }

    if (result.title) {
      const changed = result.title !== useNowPlaying.getState().title;
      useNowPlaying.setState({
        title: result.title,
        ...splitTitle(result.title),
        fetchedAt: Date.now(),
      });
      if (changed) updateLockScreenNowPlaying(station, result.title);
      return;
    }

    const { fetchedAt } = useNowPlaying.getState();
    if (fetchedAt !== null && Date.now() - fetchedAt > STALE_AFTER_MS) clear(station);
  };

  const sync = () => {
    const { station, recording, status } = usePlayer.getState();
    const target = status === "playing" && !recording ? station : null;

    if (target?.stationuuid === polling?.stationuuid) return;

    stop();
    if (!target) return;

    polling = target;
    void poll(target);
    timer = setInterval(() => void poll(target), POLL_INTERVAL_MS);
  };

  const unsubscribe = usePlayer.subscribe(sync);
  sync();

  return () => {
    unsubscribe();
    stop();
  };
}
