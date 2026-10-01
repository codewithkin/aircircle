import type { PlaybackErrorKind } from "@/lib/playback/errors";
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

/**
 * Copy for the full-screen failure state: a short label, and a line of why.
 * The headline itself is the error's own message.
 */
export const FAILURE_COPY: Record<PlaybackErrorKind, { label: string; detail: string }> = {
  offline: {
    label: "No connection",
    detail: "Live radio needs an internet connection. Favorites and Recents are still available.",
  },
  stream_offline: {
    label: "Stream offline",
    detail: "The broadcaster’s stream isn’t responding. This can be temporary.",
  },
  region_restricted: {
    label: "Region restricted",
    detail: "Broadcasters can limit where their stream plays.",
  },
  listener_limit: {
    label: "Station full",
    detail: "Too many people are listening right now. Try again in a little while.",
  },
  stale_url: {
    label: "Link changed",
    detail: "The address we have for this stream no longer works. The station’s website may have the new one.",
  },
  auth_required: {
    label: "Login required",
    detail: "The broadcaster only lets signed-in listeners play this stream.",
  },
  recording_unavailable: {
    label: "Recording",
    detail: "The saved file is missing or can’t be read. You can remove it from Recordings.",
  },
  unknown: {
    label: "Couldn’t play",
    detail: "The stream didn’t start. It may be a format this phone can’t play.",
  },
};
