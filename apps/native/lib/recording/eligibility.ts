import type { Station } from "@/lib/types";

/**
 * Stations whose broadcasters permit local recording, by Radio Browser UUID.
 *
 * Radio Browser carries no rights information, so there is nothing to derive
 * this from: a station is recordable only once it has been cleared and added
 * here. Empty means no station can be recorded in a release build — the
 * default is "no", never "probably fine".
 *
 * Territory is not modelled yet. When rights data has a source, this is the
 * one function to replace.
 */
const ELIGIBLE_STATION_UUIDS = new Set<string>([]);

export function canRecord(station: Station): boolean {
  // Development builds can record anything so the feature can be exercised
  // before any station has been cleared. Never true in a release build.
  if (__DEV__) return true;
  return ELIGIBLE_STATION_UUIDS.has(station.stationuuid);
}
