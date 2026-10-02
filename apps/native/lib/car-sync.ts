import * as FileSystem from "expo-file-system/legacy";
import { AppState, Platform } from "react-native";

import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { useRecents } from "@/stores/recents";

/**
 * Keeps the car in step with the app.
 *
 * Android Auto can start the app's car service with the app itself closed, so
 * that service can't ask JavaScript for Favorites and Recents. Instead the app
 * leaves it a small file to read, rewritten whenever those lists change:
 *
 *   car/library.json   what the car can browse   (app writes, car reads)
 *   car/played.jsonl   stations played in the car (car writes, app reads)
 *
 * The second file is how a station played from the car still shows up in
 * Recents: the car notes it down, and the app merges it in when next opened.
 */

const DIRECTORY = `${FileSystem.documentDirectory}car/`;
const LIBRARY_FILE = `${DIRECTORY}library.json`;
const PLAYED_FILE = `${DIRECTORY}played.jsonl`;

/** The car lists are short on purpose; there is no point sending more. */
const LIMIT = 30;

/** Folder names for the car, supplied by the app so they follow its language. */
export type CarLabels = {
  favorites: string;
  recents: string;
  popular: string;
  genres: string;
  /** Keyed "genre.<tag>". */
  [key: string]: string;
};

let labels: CarLabels = {
  favorites: "Favorites",
  recents: "Recent",
  popular: "Popular",
  genres: "Genres",
};

let writeTimer: ReturnType<typeof setTimeout> | null = null;

async function writeLibrary(): Promise<void> {
  const { station, recording } = usePlayer.getState();

  const library = {
    favorites: useFavorites.getState().stations.slice(0, LIMIT),
    recents: useRecents.getState().stations.slice(0, LIMIT),
    last: recording ? null : station,
    labels,
  };

  try {
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
    await FileSystem.writeAsStringAsync(LIBRARY_FILE, JSON.stringify(library));
  } catch {
    /* the car just keeps showing the previous list */
  }
}

/** Coalesces bursts of changes — a reorder, a clear — into one write. */
function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void writeLibrary();
  }, 600);
}

/** Adds stations played from the car to Recents, oldest first so order holds. */
async function mergePlayedInCar(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(PLAYED_FILE);
    if (!info.exists) return;

    const text = await FileSystem.readAsStringAsync(PLAYED_FILE);
    await FileSystem.deleteAsync(PLAYED_FILE, { idempotent: true });

    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const raw = JSON.parse(line) as Record<string, unknown>;
        const stationuuid = typeof raw.stationuuid === "string" ? raw.stationuuid : "";
        const name = typeof raw.name === "string" ? raw.name : "";
        const url = typeof raw.url === "string" ? raw.url : "";
        if (!stationuuid || !name || !url) continue;

        // The car may hand back either the app's own shape or the directory's.
        const station: Station = {
          ...(raw as Partial<Station>),
          stationuuid,
          name,
          url,
          urlResolved:
            typeof raw.urlResolved === "string"
              ? raw.urlResolved
              : typeof raw.url_resolved === "string"
                ? raw.url_resolved
                : undefined,
          countryCode:
            typeof raw.countryCode === "string"
              ? raw.countryCode
              : typeof raw.countrycode === "string"
                ? raw.countrycode
                : undefined,
        };
        useRecents.getState().add(station);
      } catch {
        /* one bad line doesn't spoil the rest */
      }
    }
  } catch {
    /* nothing to merge */
  }
}

/** Updates the folder names the car shows, e.g. after a language change. */
export function setCarLabels(next: CarLabels): void {
  labels = next;
  scheduleWrite();
}

export function startCarSync(): () => void {
  // Android Auto only; there is no car service to feed anywhere else.
  if (Platform.OS !== "android") return () => {};

  void mergePlayedInCar().then(writeLibrary);

  const unsubFavorites = useFavorites.subscribe(scheduleWrite);
  const unsubRecents = useRecents.subscribe(scheduleWrite);
  const unsubPlayer = usePlayer.subscribe((state, prev) => {
    if (state.station !== prev.station) scheduleWrite();
  });

  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active") void mergePlayedInCar();
  });

  return () => {
    unsubFavorites();
    unsubRecents();
    unsubPlayer();
    appState.remove();
    if (writeTimer) clearTimeout(writeTimer);
  };
}
