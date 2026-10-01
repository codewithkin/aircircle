import type { Recording } from "@/lib/recording/types";
import type { PauseReason, PlaybackStatus } from "@/stores/player";

export type PlaybackTone = "live" | "muted" | "amber" | "alert" | "recorded";

/**
 * The short line that says what the player is doing, for the mini player and
 * anywhere else that needs it in a few words. Plain language, one state each.
 */
export function playbackLine(input: {
  status: PlaybackStatus;
  pauseReason: PauseReason | null;
  recording: Recording | null;
  /** The station-supplied title, if there is a fresh one. */
  nowPlaying: string | null;
}): { text: string; tone: PlaybackTone } {
  const { status, pauseReason, recording, nowPlaying } = input;

  if (recording) {
    if (status === "playing") return { text: "Recorded · Playing", tone: "recorded" };
    if (status === "error") return { text: "This recording is unavailable", tone: "alert" };
    return { text: "Recorded · Paused", tone: "recorded" };
  }

  switch (status) {
    case "connecting":
      return { text: "Connecting…", tone: "muted" };
    case "buffering":
      return { text: "Waiting for the live stream…", tone: "muted" };
    case "playing":
      return { text: nowPlaying ? `Live · ${nowPlaying}` : "Live", tone: "live" };
    case "reconnecting":
      return { text: "Connection lost. Retrying…", tone: "amber" };
    case "paused":
      return {
        text: pauseReason === "external" ? "Paused · Tap to resume" : "Paused",
        tone: "muted",
      };
    case "error":
      return { text: "Couldn't play · Tap for options", tone: "alert" };
    default:
      return { text: "Tap to resume", tone: "muted" };
  }
}
