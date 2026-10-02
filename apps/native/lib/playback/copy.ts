import type { PlaybackErrorKind } from "@/lib/playback/errors";
import type { Recording } from "@/lib/recording/types";
import type { PauseReason, PlaybackStatus } from "@/stores/player";
import { msg, t } from "@/lib/i18n";

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
    if (status === "playing") return { text: t("Recorded · Playing"), tone: "recorded" };
    if (status === "error") return { text: t("This recording is unavailable"), tone: "alert" };
    return { text: t("Recorded · Paused"), tone: "recorded" };
  }

  switch (status) {
    case "connecting":
      return { text: t("Connecting…"), tone: "muted" };
    case "buffering":
      return { text: t("Waiting for the live stream…"), tone: "muted" };
    case "playing":
      return { text: nowPlaying ? t("Live · {{title}}", { title: nowPlaying }) : t("Live"), tone: "live" };
    case "reconnecting":
      return { text: t("Connection lost. Retrying…"), tone: "amber" };
    case "paused":
      return {
        text:
          pauseReason === "route"
            ? t("Paused · Audio route disconnected")
            : pauseReason === "external"
              ? t("Paused · Tap to resume")
              : t("Paused"),
        tone: "muted",
      };
    case "error":
      return { text: t("Couldn't play · Tap for options"), tone: "alert" };
    default:
      return { text: t("Tap to resume"), tone: "muted" };
  }
}

/**
 * Copy for the full-screen failure state: a short label, and a line of why.
 * The headline itself is the error's own message.
 */
export const FAILURE_COPY: Record<PlaybackErrorKind, { label: string; detail: string }> = {
  offline: {
    label: msg("No connection"),
    detail: msg("Live radio needs an internet connection. Favorites and Recents are still available."),
  },
  stream_offline: {
    label: msg("Stream offline"),
    detail: msg("The broadcaster’s stream isn’t responding. This can be temporary."),
  },
  region_restricted: {
    label: msg("Region restricted"),
    detail: msg("Broadcasters can limit where their stream plays."),
  },
  listener_limit: {
    label: msg("Station full"),
    detail: msg("Too many people are listening right now. Try again in a little while."),
  },
  stale_url: {
    label: msg("Link changed"),
    detail: msg("The address we have for this stream no longer works. The station’s website may have the new one."),
  },
  auth_required: {
    label: msg("Login required"),
    detail: msg("The broadcaster only lets signed-in listeners play this stream."),
  },
  recording_unavailable: {
    label: msg("Recording"),
    detail: msg("The saved file is missing or can’t be read. You can remove it from Recordings."),
  },
  unknown: {
    label: msg("Couldn’t play"),
    detail: msg("The stream didn’t start. It may be a format this phone can’t play."),
  },
};
