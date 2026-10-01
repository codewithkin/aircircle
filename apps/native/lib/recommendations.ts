import { getTopStations, searchStations } from "@/lib/api/radio-browser";
import type { Station } from "@/lib/types";

type Preferences = {
  genres: string[];
  places: string[];
};

/** Onboarding genre labels mapped to the tags the directory actually uses. */
const GENRE_TAGS: Record<string, string> = {
  News: "news",
  Music: "pop",
  Talk: "talk",
  Sports: "sports",
  Classical: "classical",
  Jazz: "jazz",
  Culture: "culture",
  Community: "community",
  Religious: "religious",
  "Student/College": "college",
};

export function genreTag(genre: string): string {
  return GENRE_TAGS[genre] ?? genre.toLowerCase();
}

function dedupe(stations: Station[]): Station[] {
  const seen = new Set<string>();
  return stations.filter((s) => {
    // The directory often lists one station several times under small
    // variations of its name; keep the most-listened one.
    const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(s.stationuuid) || seen.has(key)) return false;
    seen.add(s.stationuuid);
    seen.add(key);
    return true;
  });
}

/**
 * Stations to offer first, arranged from what the listener chose in
 * onboarding. This is a local arrangement, not a recommender: place and genre
 * together if that finds enough, then place alone, then genre alone.
 *
 * `matched` is false when nothing fit the choices and the result is simply
 * what's popular — the caller says so rather than passing those off as picks.
 */
export async function getStarterStations(
  prefs: Preferences,
  limit = 12,
): Promise<{ stations: Station[]; matched: boolean }> {
  const place = prefs.places[0];
  const tag = prefs.genres[0] ? genreTag(prefs.genres[0]) : undefined;

  const attempts: Parameters<typeof searchStations>[0][] = [];
  if (place && tag) attempts.push({ country: place, tag, limit });
  if (place) attempts.push({ country: place, limit });
  if (tag) attempts.push({ tag, limit });

  for (const filters of attempts) {
    const found = dedupe(await searchStations(filters));
    if (found.length >= 3) return { stations: found, matched: true };
  }

  const popular = dedupe(await getTopStations(limit * 2)).slice(0, limit);
  return { stations: popular, matched: attempts.length === 0 };
}
