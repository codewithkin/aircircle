import { AppState } from "react-native";

import { track } from "@/lib/telemetry";
import { useFavorites } from "@/stores/favorites";
import { useNetwork } from "@/stores/network";
import { useOnboarding } from "@/stores/onboarding";
import { usePlayer } from "@/stores/player";
import { useRecordings } from "@/stores/recordings";
import { useSleepTimer } from "@/stores/sleep-timer";

function network(): string {
  const { isConnected, isCellular } = useNetwork.getState();
  if (!isConnected) return "offline";
  return isCellular ? "cellular" : "wifi";
}

/**
 * Watches the app's own state and reports what happened, so screens don't have
 * to be littered with tracking calls. These are the questions the product
 * needs answered:
 *
 *   - Do people reach first audio, and how long does it take?
 *   - When playback fails, why?
 *   - Does audio survive the phone being locked?
 *   - Do people save stations, set timers, record?
 *
 * Nothing here identifies a listener or says what they listened to beyond the
 * station's public directory id, which is needed to spot stations that fail.
 */
export function startTelemetryInstrumentation(): () => void {
  let requestedAt: number | null = null;
  let backgroundedWhilePlaying = false;

  const unsubPlayer = usePlayer.subscribe((state, prev) => {
    if (state.status === prev.status && state.station === prev.station) return;
    if (state.recording) return;

    const stationId = state.station?.stationuuid ?? "";
    const country = state.station?.countryCode ?? "";

    // A new Play press: the clock for time-to-audio starts here.
    if (state.status === "connecting" && prev.status !== "reconnecting" && !state.hasAudio) {
      if (state.station !== prev.station || prev.status === "stopped" || prev.status === "error") {
        requestedAt = Date.now();
        track("Playback.requested", { stationId, country, network: network() });
      }
    }

    if (state.status === "playing" && prev.status !== "playing") {
      if (requestedAt !== null) {
        track("Playback.started", {
          stationId,
          country,
          network: network(),
          msToAudio: Date.now() - requestedAt,
          fallbackStream: state.usingFallback,
        });
        requestedAt = null;
      } else if (prev.status === "reconnecting") {
        track("Playback.reconnected", { stationId, network: network() });
      }
    }

    if (state.status === "reconnecting" && prev.status !== "reconnecting") {
      track("Playback.interrupted", { stationId, network: network() });
    }

    if (state.status === "error" && prev.status !== "error" && state.error) {
      track("Playback.failed", {
        stationId,
        country,
        network: network(),
        kind: state.error.kind,
        beforeAudio: requestedAt !== null,
      });
      requestedAt = null;
    }

    if (state.status === "paused" && prev.status === "playing" && state.pauseReason !== "user") {
      track("Playback.pausedBySystem", { reason: state.pauseReason ?? "external" });
    }
  });

  const unsubFavorites = useFavorites.subscribe((state, prev) => {
    if (state.stations.length > prev.stations.length) {
      track("Favorite.saved", { total: state.stations.length });
    } else if (state.stations.length < prev.stations.length) {
      track("Favorite.removed", { total: state.stations.length });
    }
  });

  const unsubTimer = useSleepTimer.subscribe((state, prev) => {
    if (state.endsAt !== null && prev.endsAt === null) {
      track("Timer.set", { minutes: Math.round(state.totalMs / 60_000) });
    }
    if (state.didExpire && !prev.didExpire) track("Timer.expired");
  });

  const unsubRecordings = useRecordings.subscribe((state, prev) => {
    if (state.active && !prev.active) track("Recording.started");
    if (state.lastSaved && state.lastSaved !== prev.lastSaved) {
      track("Recording.saved", {
        minutes: Math.max(1, Math.round(state.lastSaved.durationMs / 60_000)),
        megabytes: Math.round(state.lastSaved.sizeBytes / 1_000_000),
      });
    }
    if (state.failure && state.failure !== prev.failure) {
      track("Recording.failed", { reason: state.failure });
    }
  });

  const unsubOnboarding = useOnboarding.subscribe((state, prev) => {
    if (state.hasOnboarded && !prev.hasOnboarded) {
      track("Onboarding.completed", {
        intents: state.intents.length,
        genres: state.genres.length,
        places: state.places.length,
      });
    }
    if (state.hasCelebratedFirstListen && !prev.hasCelebratedFirstListen) {
      track("Onboarding.firstAudio");
    }
  });

  // Whether audio that was playing when the app left the screen is still
  // playing when it comes back — the measure of background playback holding up.
  const appState = AppState.addEventListener("change", (next) => {
    const playing = usePlayer.getState().status === "playing";
    if (next === "background") {
      backgroundedWhilePlaying = playing;
    } else if (next === "active" && backgroundedWhilePlaying) {
      backgroundedWhilePlaying = false;
      track("Playback.backgroundReturn", {
        stillPlaying: playing,
        status: usePlayer.getState().status,
      });
    }
  });

  track("App.launched", { onboarded: useOnboarding.getState().hasOnboarded, network: network() });

  return () => {
    unsubPlayer();
    unsubFavorites();
    unsubTimer();
    unsubRecordings();
    unsubOnboarding();
    appState.remove();
  };
}
