import { createAudioPlayer } from "expo-audio";
import type { AudioPlayer } from "expo-audio";

import { useSettings } from "@/stores/settings";

export type FeedbackSound = "play" | "pause" | "stop";

const SOURCES: Record<FeedbackSound, number> = {
  play: require("../assets/sounds/play.wav"),
  pause: require("../assets/sounds/pause.wav"),
  stop: require("../assets/sounds/stop.wav"),
};

/**
 * These are separate from the radio player on purpose. That one is a single,
 * carefully managed stream; these are three tiny bundled files that never
 * touch the network and are never bound to the lock screen.
 */
const players: Partial<Record<FeedbackSound, AudioPlayer>> = {};

/**
 * A short, quiet confirmation for Play, Pause and Stop.
 *
 * Off unless the listener turns it on, and only ever in response to a tap —
 * never for something the app did by itself, like a sleep timer ending or a
 * reconnect. Nothing depends on hearing it: every one of these also changes
 * what's on screen.
 */
export function playFeedback(sound: FeedbackSound): void {
  if (!useSettings.getState().soundFeedbackEnabled) return;

  try {
    let player = players[sound];
    if (!player) {
      player = createAudioPlayer(SOURCES[sound]);
      player.volume = 0.6;
      players[sound] = player;
    }
    void player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    /* a missing confirmation sound is never worth surfacing */
  }
}

/** Frees the sound players. Called when the root layout unmounts. */
export function releaseFeedbackSounds(): void {
  for (const key of Object.keys(players) as FeedbackSound[]) {
    try {
      players[key]?.remove();
    } catch {
      /* already released */
    }
    delete players[key];
  }
}
