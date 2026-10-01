import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { startNetworkRecovery } from "@/lib/playback/network-recovery";
import { useFavorites } from "@/stores/favorites";
import { startNetworkListener, useNetwork } from "@/stores/network";
import { releaseAllPlayers, usePlayer } from "@/stores/player";
import { useRecents } from "@/stores/recents";
import { startSleepTimerService } from "@/stores/sleep-timer";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  // Playback lives here, above every screen, so navigation never touches it.
  useEffect(() => {
    void usePlayer.getState().setup();
    usePlayer.getState().restore();
    useRecents.getState().restore();
    useFavorites.getState().restore();

    void useNetwork.getState().check();
    const unsubNetwork = startNetworkListener();
    const unsubRecovery = startNetworkRecovery();
    const unsubSleepTimer = startSleepTimerService();

    return () => {
      unsubNetwork();
      unsubRecovery();
      unsubSleepTimer();
      releaseAllPlayers();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <HeroUINativeProvider>
            <StackLayout />
          </HeroUINativeProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
