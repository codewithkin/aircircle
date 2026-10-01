import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { useRecentSearches } from "@/stores/recent-searches";
import { useRecents } from "@/stores/recents";
import { useRecordings } from "@/stores/recordings";
import { useSleepTimer } from "@/stores/sleep-timer";

/**
 * Settings → Local data → Clear. Removes everything the listener has built up
 * on this device: Favorites, Recents, the last station, any sleep timer,
 * recordings and their audio files, and recent searches.
 *
 * Destructive and not undoable — the caller must have confirmed first.
 * Preferences (theme, feedback) and the onboarding flag are kept: clearing
 * your stations shouldn't also reset how the app looks.
 */
export function clearLocalData(): void {
  // Player first: it stops audio and forgets the last station, and nothing
  // should still be playing a recording whose file is about to go.
  usePlayer.getState().dismiss();
  useSleepTimer.getState().cancel();

  useRecordings.getState().clearAll();
  useFavorites.getState().clear();
  useRecents.getState().clear();
  useRecentSearches.getState().clear();
}
