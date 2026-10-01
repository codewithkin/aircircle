import { create } from "zustand";

import { getJson, remove, setJson } from "@/lib/storage";
import type { Station } from "@/lib/types";

const FAVORITES_KEY = "favorites.stations";

type FavoritesState = {
  /** In the listener's own order; new favorites go to the end. */
  stations: Station[];
};

type FavoritesActions = {
  isFavorite: (stationuuid: string) => boolean;
  /** `index` puts it back where it was — that is how Undo restores a removal. */
  add: (station: Station, index?: number) => void;
  remove: (stationuuid: string) => void;
  toggle: (station: Station) => void;
  move: (from: number, to: number) => void;
  clear: () => void;
  restore: () => void;
};

export const useFavorites = create<FavoritesState & FavoritesActions>((set, get) => {
  const commit = (stations: Station[]) => {
    setJson(FAVORITES_KEY, stations);
    set({ stations });
  };

  return {
    stations: [],

    isFavorite: (stationuuid: string) =>
      get().stations.some((s) => s.stationuuid === stationuuid),

    add: (station: Station, index?: number) => {
      if (get().isFavorite(station.stationuuid)) return;
      const updated = [...get().stations];
      updated.splice(index ?? updated.length, 0, station);
      commit(updated);
    },

    remove: (stationuuid: string) => {
      commit(get().stations.filter((s) => s.stationuuid !== stationuuid));
    },

    toggle: (station: Station) => {
      if (get().isFavorite(station.stationuuid)) get().remove(station.stationuuid);
      else get().add(station);
    },

    move: (from: number, to: number) => {
      const updated = [...get().stations];
      if (from < 0 || from >= updated.length || to < 0 || to >= updated.length) return;
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      commit(updated);
    },

    clear: () => {
      remove(FAVORITES_KEY);
      set({ stations: [] });
    },

    restore: () => {
      const list = getJson<Station[]>(FAVORITES_KEY);
      if (Array.isArray(list)) set({ stations: list });
    },
  };
});
