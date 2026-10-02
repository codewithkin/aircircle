import "@/global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind } from "uniwind";

import { QuickActions } from "@/components/station/quick-actions";
import { ToastHost } from "@/components/ui/toast-host";
import { startAudioRouteListener } from "@/lib/audio-route";
import { startDataNoticeService } from "@/lib/playback/data-notice";
import { startNetworkRecovery } from "@/lib/playback/network-recovery";
import { startRecordingGuard } from "@/lib/recording/recording-guard";
import { releaseFeedbackSounds } from "@/lib/sounds";
import { useFavorites } from "@/stores/favorites";
import { startNetworkListener, useNetwork } from "@/stores/network";
import { startNowPlayingService } from "@/stores/now-playing";
import { useOnboarding } from "@/stores/onboarding";
import { releaseAllPlayers, usePlayer } from "@/stores/player";
import { useRecentSearches } from "@/stores/recent-searches";
import { useRecents } from "@/stores/recents";
import { useRecordings } from "@/stores/recordings";
import { useSettings } from "@/stores/settings";
import { startSleepTimerService } from "@/stores/sleep-timer";
import { fontAssets } from "@/theme/fonts";
import { colors } from "@/theme/tokens";

// Keep the splash up until the fonts are in: a first frame in a fallback font
// is a visibly different app.
void SplashScreen.preventAutoHideAsync();

// Soft Air is a light design; the dark screens set their own colours.
Uniwind.setTheme("light");

// Everything saved on the device is read before the first render, so the
// first frame already shows the listener's own stations.
usePlayer.getState().restore();
useRecents.getState().restore();
useFavorites.getState().restore();
useRecordings.getState().restore();
useRecentSearches.getState().restore();
useSettings.getState().restore();

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const hasOnboarded = useOnboarding((s) => s.hasOnboarded);

  // Playback lives here, above every screen, so navigation never touches it.
  useEffect(() => {
    void usePlayer.getState().setup();

    void useNetwork.getState().check();
    const unsubNetwork = startNetworkListener();
    const unsubRecovery = startNetworkRecovery();
    const unsubSleepTimer = startSleepTimerService();
    const unsubRecordingGuard = startRecordingGuard();
    const unsubNowPlaying = startNowPlayingService();
    const unsubDataNotice = startDataNoticeService();
    const unsubAudioRoute = startAudioRouteListener();

    return () => {
      unsubNetwork();
      unsubRecovery();
      unsubSleepTimer();
      unsubRecordingGuard();
      unsubNowPlaying();
      unsubDataNotice();
      unsubAudioRoute();
      releaseFeedbackSounds();
      releaseAllPlayers();
    };
  }, []);

  // A font failure must not brick launch — fall through to system fonts.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
            animation: "slide_from_right",
          }}
        >
          <Stack.Protected guard={!hasOnboarded}>
            <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
          </Stack.Protected>

          <Stack.Protected guard={hasOnboarded}>
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          </Stack.Protected>

          {/* The player rises from the mini player and leaves the same way. */}
          <Stack.Screen
            name="now-playing"
            options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }}
          />
          <Stack.Screen
            name="sleep-timer"
            options={{
              animation: "slide_from_bottom",
              gestureDirection: "vertical",
              contentStyle: { backgroundColor: colors.night },
            }}
          />
          <Stack.Screen name="station/[id]" />
          <Stack.Screen name="stations" />
          <Stack.Screen name="browse" />
          <Stack.Screen name="nearby" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="local-data" />
          <Stack.Screen name="recordings" />
        </Stack>

        <QuickActions />
        <ToastHost />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
