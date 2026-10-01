import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";

/**
 * How one particular station relates to the player right now. Rows, tiles and
 * detail screens use this so a station shows the same state everywhere.
 */
export type StationPlayback =
  /** Not the station that's loaded. */
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "reconnecting"
  | "error";

export function useStationPlayback(station: Pick<Station, "stationuuid"> | null): StationPlayback {
  return usePlayer((s) => {
    // A saved recording shares its station's id but is not that station live.
    if (!station || s.recording || s.station?.stationuuid !== station.stationuuid) return "idle";

    switch (s.status) {
      case "connecting":
      case "buffering":
        return "loading";
      case "playing":
        return "playing";
      case "reconnecting":
        return "reconnecting";
      case "error":
        return "error";
      case "paused":
      case "stopped":
        return "paused";
      default:
        return "idle";
    }
  });
}
