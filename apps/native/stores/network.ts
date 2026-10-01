import * as Network from "expo-network";
import { create } from "zustand";

type NetworkState = {
  isConnected: boolean;
  isLoading: boolean;
};

type NetworkActions = {
  check: () => Promise<void>;
  setConnected: (connected: boolean) => void;
};

export const useNetwork = create<NetworkState & NetworkActions>((set) => ({
  isConnected: true,
  isLoading: true,

  check: async () => {
    const state = await Network.getNetworkStateAsync();
    set({ isConnected: state.isConnected ?? true, isLoading: false });
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },
}));

export function startNetworkListener(): () => void {
  const subscription = Network.addNetworkStateListener((state) => {
    useNetwork.getState().setConnected(state.isConnected ?? true);
  });
  return () => subscription.remove();
}
