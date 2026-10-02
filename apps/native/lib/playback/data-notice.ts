import { useNetwork } from "@/stores/network";
import { usePlayer } from "@/stores/player";
import { useSettings } from "@/stores/settings";
import { useToast } from "@/stores/toast";
import { t } from "@/lib/i18n";

/**
 * Tells the listener when live radio starts using mobile data.
 *
 * Shown once per run of being on mobile data — when a station starts on it, or
 * when a playing station moves from Wi-Fi to it — and not again until the
 * phone has been back on Wi-Fi. It is a notice, not a gate: playback is never
 * paused or blocked by it.
 */
export function startDataNoticeService(): () => void {
  let noticed = false;

  const evaluate = () => {
    const { isConnected, isCellular } = useNetwork.getState();
    const { status, recording } = usePlayer.getState();

    // Back on Wi-Fi (or offline): the next move to mobile data is news again.
    if (!isConnected || !isCellular) {
      noticed = false;
      return;
    }

    if (noticed || recording || status !== "playing") return;
    if (!useSettings.getState().mobileDataNotice) return;

    noticed = true;
    useToast.getState().show({
      message: t("Playing on mobile data"),
      icon: "data_usage",
    });
  };

  const unsubNetwork = useNetwork.subscribe(evaluate);
  const unsubPlayer = usePlayer.subscribe((state, prev) => {
    if (state.status !== prev.status) evaluate();
  });

  return () => {
    unsubNetwork();
    unsubPlayer();
  };
}
