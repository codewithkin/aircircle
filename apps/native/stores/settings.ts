import { create } from "zustand";

import { getJson, setJson } from "@/lib/storage";

const SETTINGS_KEY = "settings";

export type ThemePreference = "system" | "light" | "dark";

type Settings = {
  theme: ThemePreference;
  hapticsEnabled: boolean;
  /** Short confirmation sounds on Play/Pause. Never needed to understand state. */
  soundFeedbackEnabled: boolean;
  /** Tell the listener when playback starts using mobile data. */
  mobileDataNotice: boolean;
};

const DEFAULTS: Settings = {
  theme: "system",
  hapticsEnabled: true,
  soundFeedbackEnabled: false,
  mobileDataNotice: true,
};

type SettingsActions = {
  update: (changes: Partial<Settings>) => void;
  restore: () => void;
};

export const useSettings = create<Settings & SettingsActions>((set, get) => ({
  ...DEFAULTS,

  update: (changes: Partial<Settings>) => {
    set(changes);
    const { theme, hapticsEnabled, soundFeedbackEnabled, mobileDataNotice } = get();
    setJson<Settings>(SETTINGS_KEY, {
      theme,
      hapticsEnabled,
      soundFeedbackEnabled,
      mobileDataNotice,
    });
  },

  restore: () => {
    const saved = getJson<Partial<Settings>>(SETTINGS_KEY);
    // Defaults first, so a setting added in a later version has a value.
    if (saved && typeof saved === "object") set({ ...DEFAULTS, ...saved });
  },
}));
