import { usePlayer } from "@/stores/player";
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

  return () => {
    unsubPlayer();
    unsubRecordings();
  };
}
