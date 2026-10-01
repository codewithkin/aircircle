import { useNetwork } from "@/stores/network";
import { usePlayer } from "@/stores/player";

/**
 * Tells the player when connectivity drops and when it comes back. The player
 * decides what that means — it only reconnects a session the network itself
 * interrupted, never one the listener paused or stopped.
 */
export function startNetworkRecovery(): () => void {
  return useNetwork.subscribe((state, prevState) => {
    if (state.isConnected === prevState.isConnected) return;

    const player = usePlayer.getState();
    if (state.isConnected) player.handleNetworkRestored();
    else player.handleNetworkLost();
  });
}
