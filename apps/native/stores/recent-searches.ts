import { create } from "zustand";

import { getJson, remove, setJson } from "@/lib/storage";

const SEARCHES_KEY = "recent.searches";
const MAX_SEARCHES = 10;

type RecentSearchesState = {
  /** Newest first. */
  queries: string[];
};

type RecentSearchesActions = {
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
  restore: () => void;
};

export const useRecentSearches = create<RecentSearchesState & RecentSearchesActions>(
  (set, get) => ({
    queries: [],

    add: (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      // "BBC" and "bbc" are the same search; keep the latest spelling.
      const others = get().queries.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...others].slice(0, MAX_SEARCHES);
      setJson(SEARCHES_KEY, updated);
      set({ queries: updated });
    },

    remove: (query: string) => {
      const updated = get().queries.filter((q) => q !== query);
      setJson(SEARCHES_KEY, updated);
      set({ queries: updated });
    },

    clear: () => {
      remove(SEARCHES_KEY);
      set({ queries: [] });
    },

    restore: () => {
      const list = getJson<string[]>(SEARCHES_KEY);
      if (Array.isArray(list)) set({ queries: list.slice(0, MAX_SEARCHES) });
    },
  }),
);
