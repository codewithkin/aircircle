import * as Network from "expo-network";
import { create } from "zustand";

type NetworkState = {
  isConnected: boolean;
  /** True when the connection in use is mobile data rather than Wi-Fi. */
  isCellular: boolean;
  isLoading: boolean;
};

type NetworkActions = {
  check: () => Promise<void>;
  apply: (state: Network.NetworkState) => void;
};

export const useNetwork = create<NetworkState & NetworkActions>((set, get) => ({
  isConnected: true,
  isCellular: false,
  isLoading: true,

  check: async () => {
    get().apply(await Network.getNetworkStateAsync());
  },

  apply: (state) => {
    set({
      isConnected: state.isConnected ?? true,
      isCellular: state.type === Network.NetworkStateType.CELLULAR,
      isLoading: false,
    });
  },
}));

export function startNetworkListener(): () => void {
  const subscription = Network.addNetworkStateListener((state) => {
    useNetwork.getState().apply(state);
  });
  return () => subscription.remove();
}
