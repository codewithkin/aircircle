import type { Station } from "@/lib/types";

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Up to `max` genres, tidied for display: "Jazz, Swing". */
export function stationGenres(station: Station, max = 2): string {
  return (station.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && t.length <= 18)
    .slice(0, max)
    .map(titleCase)
    .join(", ");
}

/** "Lisbon, Portugal" — or whichever half the directory has. */
export function stationPlace(station: Station): string {
  return [station.state, station.country].filter(Boolean).join(", ");
}

/** The most local name available: the city or region, else the country. */
export function stationLocality(station: Station): string {
  return station.state || station.country || "";
}

/** "Lisbon, Portugal · Jazz" */
export function stationSubtitle(station: Station): string {
  return [stationPlace(station), stationGenres(station)].filter(Boolean).join(" · ");
}

/** "Lisbon · Jazz" — for tight rows. */
export function stationShortSubtitle(station: Station): string {
  return [stationLocality(station), stationGenres(station, 1)].filter(Boolean).join(" · ");
}

/**
 * Whether the directory's last health check failed. Unknown counts as
 * available: a station is only greyed out when there is evidence against it.
 */
export function isUnavailable(station: Station): boolean {
  return station.lastCheckOk === false;
}

/* ------------------------------------------------------------------------ *
 * Station hand-off between screens
 *
 * Routes carry only a station's id. The screen that navigates already has the
 * whole station, so it leaves it here for the next screen to pick up without a
 * network round-trip. Memory only — nothing here outlives the session.
 * ------------------------------------------------------------------------ */

const remembered = new Map<string, Station>();

export function rememberStation(station: Station): void {
  remembered.set(station.stationuuid, station);
}

export function recallStation(stationuuid: string): Station | undefined {
  return remembered.get(stationuuid);
}
