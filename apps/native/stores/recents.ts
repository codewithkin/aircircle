import { create } from "zustand";

import { getJson, remove, setJson } from "@/lib/storage";
import type { Station } from "@/lib/types";

const RECENT_KEY = "recent.stations";
const MAX_RECENT = 50;

type RecentsState = {
  stations: Station[];
};

type RecentsActions = {
  add: (station: Station) => void;
  remove: (stationuuid: string) => void;
  clear: () => void;
  restore: () => void;
};

export const useRecents = create<RecentsState & RecentsActions>((set, get) => ({
  stations: [],

  add: (station: Station) => {
    // Move to front if already present, otherwise prepend.
    const existing = get().stations.filter((s) => s.stationuuid !== station.stationuuid);
    const updated = [station, ...existing].slice(0, MAX_RECENT);
    setJson(RECENT_KEY, updated);
    set({ stations: updated });
  },

  remove: (stationuuid: string) => {
    const updated = get().stations.filter((s) => s.stationuuid !== stationuuid);
    setJson(RECENT_KEY, updated);
    set({ stations: updated });
  },

  clear: () => {
    remove(RECENT_KEY);
    set({ stations: [] });
  },

  restore: () => {
    const list = getJson<Station[]>(RECENT_KEY);
    if (Array.isArray(list)) set({ stations: list.slice(0, MAX_RECENT) });
  },
}));
