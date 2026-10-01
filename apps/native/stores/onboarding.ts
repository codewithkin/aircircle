import { create } from "zustand";

import { getJson, setJson } from "@/lib/storage";

const ONBOARDING_KEY = "onboarding";

/** "What brings you to radio?" — multi-select. */
export type ListeningIntent =
  | "known-station"
  | "local"
  | "discover"
  | "background"
  | "sleep"
  | "simple";

type Onboarding = {
  hasOnboarded: boolean;
  intents: ListeningIntent[];
  genres: string[];
  /** Country names chosen by hand. Empty means "Anywhere". */
  places: string[];
  /** Whether the first-listen celebration has already been shown. */
  hasCelebratedFirstListen: boolean;
  /**
   * Progress through the three first-listen tips: the number already seen.
   * 3 (or more) means the sequence is finished or was skipped.
   */
  tipsSeen: number;
};

const DEFAULTS: Onboarding = {
  hasOnboarded: false,
  intents: [],
  genres: [],
  places: [],
  hasCelebratedFirstListen: false,
  tipsSeen: 0,
};

type OnboardingActions = {
  toggleIntent: (intent: ListeningIntent) => void;
  toggleGenre: (genre: string) => void;
  togglePlace: (place: string) => void;
  /** Ends onboarding — also what Skip calls, with whatever was chosen so far. */
  complete: () => void;
  markFirstListenCelebrated: () => void;
  /** Moves on to the next tip. */
  advanceTips: () => void;
  /** Ends the tip sequence for good. */
  skipTips: () => void;
  reset: () => void;
};

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

// Read synchronously at creation, so the very first frame already knows which
// flow to mount — the app never shows Home and then snaps to onboarding.
const saved = getJson<Partial<Onboarding>>(ONBOARDING_KEY);

export const useOnboarding = create<Onboarding & OnboardingActions>((set, get) => {
  const update = (changes: Partial<Onboarding>) => {
    set(changes);
    const { hasOnboarded, intents, genres, places, hasCelebratedFirstListen, tipsSeen } = get();
    setJson<Onboarding>(ONBOARDING_KEY, {
      hasOnboarded,
      intents,
      genres,
      places,
      hasCelebratedFirstListen,
      tipsSeen,
    });
  };

  return {
    ...DEFAULTS,
    ...(saved && typeof saved === "object" ? saved : {}),

    toggleIntent: (intent) => update({ intents: toggled(get().intents, intent) }),
    toggleGenre: (genre) => update({ genres: toggled(get().genres, genre) }),
    togglePlace: (place) => update({ places: toggled(get().places, place) }),
    complete: () => update({ hasOnboarded: true }),
    markFirstListenCelebrated: () => update({ hasCelebratedFirstListen: true }),
    advanceTips: () => update({ tipsSeen: get().tipsSeen + 1 }),
    skipTips: () => update({ tipsSeen: 3 }),
    reset: () => update(DEFAULTS),
  };
});
