import { AppState } from "react-native";
import { create } from "zustand";

import { usePlayer } from "@/stores/player";

export const SLEEP_TIMER_PRESETS_MIN = [5, 15, 30, 60] as const;

let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

type SleepTimerState = {
  /** Epoch ms when playback will stop; null when no timer is set. */
  endsAt: number | null;
  /** True after the timer stopped playback, until the next Play or timer. */
  didExpire: boolean;
};

type SleepTimerActions = {
  /** Starts a countdown, replacing any timer already running. */
  start: (minutes: number) => void;
  cancel: () => void;
  /** Stops playback if the deadline has passed. Safe to call at any time. */
  check: () => void;
};

export const useSleepTimer = create<SleepTimerState & SleepTimerActions>((set, get) => ({
  endsAt: null,
  didExpire: false,

  start: (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;

    clearTimer();
    const durationMs = Math.round(minutes * 60_000);
    set({ endsAt: Date.now() + durationMs, didExpire: false });
    timer = setTimeout(() => get().check(), durationMs);
  },

  cancel: () => {
    clearTimer();
    set({ endsAt: null });
  },

  check: () => {
    const { endsAt } = get();
    if (endsAt === null || Date.now() < endsAt) return;

    clearTimer();
    // Flagged before stopping so the subscription below, which cancels the
    // timer on any stop, can tell this one apart from the listener's.
    set({ endsAt: null, didExpire: true });
    usePlayer.getState().stop();
  },
}));

/**
 * Keeps the timer honest and tied to playback.
 *
 * JS timers can be delayed while the app is backgrounded, so the deadline is
 * re-checked against the clock whenever the app comes forward — a late timer
 * still stops audio the moment the app is looked at.
 *
 * A timer with nothing left to stop is cancelled: Stop and Dismiss end it.
 * Pause does not — pausing for a minute shouldn't cost the listener their
 * timer.
 */
export function startSleepTimerService(): () => void {
  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active") useSleepTimer.getState().check();
  });

  const unsubscribe = usePlayer.subscribe((state, prevState) => {
    if (state.status === prevState.status) return;

    if (state.status === "stopped" || state.status === "idle") {
      useSleepTimer.getState().cancel();
    } else if (state.status === "connecting" && useSleepTimer.getState().didExpire) {
      useSleepTimer.setState({ didExpire: false });
    }
  });

  return () => {
    appState.remove();
    unsubscribe();
    clearTimer();
  };
}
