import { RadioBrowserApi } from "radio-browser-api";
import type { Station as ApiStation } from "radio-browser-api";

import type { Station } from "@/lib/types";

let apiInstance: RadioBrowserApi | null = null;

function getApi(): RadioBrowserApi {
  if (!apiInstance) {
    apiInstance = new RadioBrowserApi("Aircircle/1.0", true);
  }
  return apiInstance;
}

function mapStation(s: ApiStation): Station {
  const checked = s.lastCheckTime instanceof Date ? s.lastCheckTime.getTime() : NaN;

  return {
    stationuuid: s.id,
    name: s.name.trim(),
    url: s.url,
    urlResolved: s.urlResolved,
    homepage: s.homepage || undefined,
    favicon: s.favicon || undefined,
    country: s.country,
    countryCode: s.countryCode,
    state: s.state || undefined,
    language: Array.isArray(s.language) ? s.language.join(",") : String(s.language),
    tags: Array.isArray(s.tags) ? s.tags.join(",") : String(s.tags),
    codec: s.codec,
    bitrate: s.bitrate,
    hls: s.hls,
    lastCheckOk: s.lastCheckOk,
    lastCheckTime: Number.isFinite(checked) ? checked : undefined,
    geoLat: s.geoLat,
    geoLong: s.geoLong,
    votes: s.votes,
    clickcount: s.clickCount,
  };
}

/** Every filter is optional; combine freely. Text filters match partially. */
export type StationFilters = {
  /** Station name or call sign. */
  name?: string;
  country?: string;
  /** ISO 3166-1 alpha-2. Exact. */
  countryCode?: string;
  /** Region or city. */
  state?: string;
  language?: string;
  /** Genre. */
  tag?: string;
  limit?: number;
  offset?: number;
};

export async function searchStations(query: string | StationFilters): Promise<Station[]> {
  const filters = typeof query === "string" ? { name: query } : query;
  const { limit = 25, offset = 0, ...rest } = filters;

  const results = await getApi().searchStations({
    ...rest,
    limit,
    offset,
    order: "clickCount",
    reverse: true,
    // Stations the directory couldn't reach on its last check are left out
    // rather than listed as if they were playable.
    hideBroken: true,
  });
  return results.map(mapStation);
}

export async function getTopStations(limit = 20): Promise<Station[]> {
  const results = await getApi().getStationsByClicks(limit);
  return results.map(mapStation);
}

/** Fresh copy of one station, or null if the directory no longer lists it. */
export async function getStationByUuid(stationuuid: string): Promise<Station | null> {
  const results = await getApi().getStationsById([stationuuid]);
  return results[0] ? mapStation(results[0]) : null;
}

/** A browse category with how many stations sit under it. */
export type BrowseEntry = { name: string; stationCount: number };

const BROWSE_QUERY = { order: "stationcount", reverse: true, hideBroken: true } as const;

function mapEntries(results: { name: string; stationcount: number }[]): BrowseEntry[] {
  return results
    .filter((r) => r.name.trim() && r.stationcount > 0)
    .map((r) => ({ name: r.name, stationCount: r.stationcount }));
}

export async function getCountries(search?: string): Promise<BrowseEntry[]> {
  return mapEntries(await getApi().getCountries(search, BROWSE_QUERY));
}

export async function getLanguages(search?: string): Promise<BrowseEntry[]> {
  return mapEntries(await getApi().getLanguages(search, BROWSE_QUERY));
}

/** Genres. The directory has tens of thousands of one-off tags, hence the cap. */
export async function getGenres(search?: string, limit = 100): Promise<BrowseEntry[]> {
  return mapEntries(await getApi().getTags(search, { ...BROWSE_QUERY, limit }));
}

/** Regions and cities within a country. */
export async function getCountryStates(country: string): Promise<BrowseEntry[]> {
  return mapEntries(await getApi().getCountryStates(country, BROWSE_QUERY));
}

export async function sendStationClick(stationuuid: string): Promise<void> {
  await getApi().sendStationClick(stationuuid);
}
