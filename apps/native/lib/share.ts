import { Share } from "react-native";

import type { Station } from "@/lib/types";

/**
 * The text handed to the native share sheet. Station-only by default: what is
 * on air right now is included only when the caller passes it, which it should
 * do only for fresh metadata the listener opted to share.
 */
export function buildSharePayload(station: Station, nowPlaying?: string | null): string {
  const place = [station.state, station.country].filter(Boolean).join(", ");
  const genre = station.tags?.split(",").filter(Boolean).slice(0, 2).join(", ");

  const lines = [
    station.name,
    [place, genre].filter(Boolean).join(" · "),
    nowPlaying ? `Now playing: ${nowPlaying}` : "",
    station.homepage ?? "",
    "Found on Aircircle",
  ];

  return lines.filter(Boolean).join("\n");
}

/**
 * Opens the native share sheet. Resolves true if the listener shared, false if
 * they cancelled — either way playback is untouched.
 */
export async function shareStation(station: Station, nowPlaying?: string | null): Promise<boolean> {
  try {
    const result = await Share.share({ message: buildSharePayload(station, nowPlaying) });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
