export type PlaybackErrorKind =
  | "offline"
  | "stream_offline"
  | "region_restricted"
  | "listener_limit"
  | "stale_url"
  | "auth_required"
  | "unknown";

export type PlaybackError = {
  kind: PlaybackErrorKind;
  /** Plain-language copy for the listener. */
  message: string;
  /** The raw native message, kept so a failure can be reported and diagnosed. */
  detail: string | null;
};

const MESSAGES: Record<PlaybackErrorKind, string> = {
  offline: "You're offline. Live radio needs an internet connection.",
  stream_offline: "This station is offline right now.",
  region_restricted: "This station is unavailable in your area.",
  listener_limit: "This station has reached its listener limit.",
  stale_url: "This station link may have changed.",
  auth_required: "This station requires a login or subscription.",
  unknown: "This station couldn't be played.",
};

const NETWORK_PATTERN =
  /network|timeout|timed out|connection|unreachable|enotfound|econnrefused|offline|unknownhost|resolve host/i;

function messageOf(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (reason && typeof reason === "object" && "message" in reason) {
    return String((reason as { message: unknown }).message);
  }
  return "";
}

/**
 * Best-effort bucketing of whatever the native player said. ExoPlayer and
 * AVPlayer don't hand back a structured cause, so this reads HTTP status codes
 * and keywords out of the message. Anything it can't place stays `unknown`
 * rather than being guessed into a more specific bucket.
 *
 * `online` comes from the OS, not the message: a DNS or socket failure while
 * the device reports a connection is the station's problem, not the listener's.
 */
function kindOf(message: string, online: boolean): PlaybackErrorKind {
  if (!online) return "offline";

  const status = /\b([45]\d\d)\b/.exec(message)?.[1];
  if (status === "401" || status === "402" || status === "407") return "auth_required";
  if (status === "451" || /geo|region|not available in your/i.test(message)) {
    return "region_restricted";
  }
  if (status === "404" || status === "410") return "stale_url";
  if (status === "429" || /listener limit|too many|server (is )?full|max(imum)? listeners/i.test(message)) {
    return "listener_limit";
  }
  if (status?.startsWith("5")) return "stream_offline";
  if (NETWORK_PATTERN.test(message)) return "stream_offline";
  return "unknown";
}

export function classifyPlaybackError(reason: unknown, online: boolean): PlaybackError {
  const detail = messageOf(reason).trim();
  const kind = kindOf(detail, online);
  return { kind, message: MESSAGES[kind], detail: detail || null };
}

/** Kinds where trying again won't help until something outside the app changes. */
export function isRetryable(kind: PlaybackErrorKind): boolean {
  return kind === "stream_offline" || kind === "listener_limit" || kind === "unknown";
}
