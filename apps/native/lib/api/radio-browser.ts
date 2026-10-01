import { RadioBrowserApi } from "radio-browser-api";

import type { Station } from "@/lib/types";

let apiInstance: RadioBrowserApi | null = null;

function getApi(): RadioBrowserApi {
  if (!apiInstance) {
    apiInstance = new RadioBrowserApi("Aircircle/1.0", true);
  }
  return apiInstance;
}

function mapStation(s: {
  id: string;
  name: string;
  url: string;
  urlResolved: string;
  country: string;
  favicon: string;
  codec: string;
  bitrate: number;
  tags: string[];
  language: string[];
  votes: number;
  clickCount: number;
}): Station {
  return {
    stationuuid: s.id,
    name: s.name,
    url: s.url,
    urlResolved: s.urlResolved,
    country: s.country,
    favicon: s.favicon,
    codec: s.codec,
    bitrate: s.bitrate,
    tags: Array.isArray(s.tags) ? s.tags.join(",") : String(s.tags),
    language: Array.isArray(s.language) ? s.language.join(",") : String(s.language),
    votes: s.votes,
    clickcount: s.clickCount,
  };
}

export async function searchStations(query: string): Promise<Station[]> {
  const api = getApi();
  const results = await api.searchStations({
    name: query,
    limit: 25,
    order: "clickCount",
    reverse: true,
    hideBroken: true,
  });
  return results.map(mapStation);
}

export async function getTopStations(limit = 20): Promise<Station[]> {
  const api = getApi();
  const results = await api.getStationsByClicks(limit);
  return results.map(mapStation);
}

export async function sendStationClick(stationuuid: string): Promise<void> {
  const api = getApi();
  await api.sendStationClick(stationuuid);
}
