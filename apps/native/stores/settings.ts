import { create } from "zustand";

import { getJson, setJson } from "@/lib/storage";

const SETTINGS_KEY = "settings";

export type ThemePreference = "system" | "light" | "dark";
export type ResumePolicy = "ask" | "always" | "never";
export type StreamQuality = "auto" | "saver";

type Settings = {
  theme: ThemePreference;
  /** Keeps movement to a minimum, on top of the system setting. */
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  /** Short confirmation sounds on Play/Pause. Never needed to understand state. */
  soundFeedbackEnabled: boolean;
  /** Tell the listener when playback starts using mobile data. */
  mobileDataNotice: boolean;
  /** What happens when a call or other interruption ends. */
  resumeAfterInterruption: ResumePolicy;
  /** The preset the sleep timer screen opens on, in minutes. */
  defaultSleepMinutes: number;
  /** Data saver prefers a lower-bitrate stream when a station offers one. */
  streamQuality: StreamQuality;
};

const DEFAULTS: Settings = {
  theme: "system",
  reduceMotion: false,
  hapticsEnabled: true,
  soundFeedbackEnabled: false,
  mobileDataNotice: true,
  resumeAfterInterruption: "ask",
  defaultSleepMinutes: 30,
  streamQuality: "auto",
};

type SettingsActions = {
  update: (changes: Partial<Settings>) => void;
  restore: () => void;
};

export const useSettings = create<Settings & SettingsActions>((set, get) => ({
  ...DEFAULTS,

  update: (changes: Partial<Settings>) => {
    set(changes);
    const { update: _update, restore: _restore, ...settings } = get();
    setJson<Settings>(SETTINGS_KEY, settings);
  },

  restore: () => {
    const saved = getJson<Partial<Settings>>(SETTINGS_KEY);
    // Defaults first, so a setting added in a later version has a value.
    if (saved && typeof saved === "object") set({ ...DEFAULTS, ...saved });
  },
}));
