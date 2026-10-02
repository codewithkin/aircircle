import { AppState } from "react-native";

import { MAX_RECORDING_MS } from "@/lib/recording/recorder";
import { onPlaybackHeartbeat, usePlayer } from "@/stores/player";
import { useRecordings } from "@/stores/recordings";

/**
 * Keeps recording and playback consistent with each other.
 *
 * A recording is of the station being listened to. When that station stops
 * being what's on — stopped, dismissed, failed, or swapped for something else —
 * the recording is ended and saved rather than left running unseen in the
 * background. Pause does not end it.
 *
 * And the other way round: deleting the recording that is currently loaded
 * unloads it from the player, so nothing keeps pointing at a file that is gone.
 *
 * Two background safeguards as well:
 *
 *   - The length limit is enforced on the playback heartbeat, not only on a
 *     timer, because a backgrounded app's timers can fire late.
 *   - If the app is sent to the background while a recording is running and
 *     nothing is playing, the recording is saved there and then. Without
 *     audio playing the system is free to suspend the app, which would
 *     otherwise cut the file off unsaved.
 */
export function startRecordingGuard(): () => void {
  const unsubPlayer = usePlayer.subscribe((state) => {
    const active = useRecordings.getState().active;
    if (!active) return;

    const stationChanged =
      state.recording !== null || state.station?.stationuuid !== active.station.stationuuid;
    const ended = state.status === "stopped" || state.status === "idle" || state.status === "error";

    if (stationChanged || ended) void useRecordings.getState().stop();
  });

  const unsubRecordings = useRecordings.subscribe((state, prevState) => {
    if (state.recordings === prevState.recordings) return;

    const loaded = usePlayer.getState().recording;
    if (loaded && !state.recordings.some((r) => r.id === loaded.id)) {
      usePlayer.getState().dismiss();
    }
  });

  const unsubHeartbeat = onPlaybackHeartbeat(() => {
    const active = useRecordings.getState().active;
    if (active && Date.now() - active.startedAt >= MAX_RECORDING_MS) {
      void useRecordings.getState().stop();
    }
  });

  const appState = AppState.addEventListener("change", (next) => {
    if (next !== "background") return;
    if (!useRecordings.getState().active) return;
    if (usePlayer.getState().status !== "playing") void useRecordings.getState().stop();
  });

  return () => {
    unsubPlayer();
    unsubRecordings();
    unsubHeartbeat();
    appState.remove();
  };
}
