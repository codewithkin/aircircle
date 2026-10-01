import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { useEffect } from "react";
import { Linking, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Coach } from "@/components/player/coach";
import { ControlBar } from "@/components/player/control-bar";
import { NowPlayingArt } from "@/components/player/now-playing-art";
import { OnAirCard, RecordedCard, RecordingCard } from "@/components/player/now-playing-cards";
import {
  ConnectingView,
  FailureView,
  ReconnectingView,
} from "@/components/player/now-playing-states";
import { PlayButton } from "@/components/station/play-button";
import { IconButton } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { EqBars } from "@/components/ui/live";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import type { Atmosphere } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { canRecord } from "@/lib/recording/eligibility";
import { RECORDING_FAILURE_MESSAGES } from "@/lib/recording/types";
import { stationSubtitle } from "@/lib/station";
import { usePlayer } from "@/stores/player";
import { useRecordings } from "@/stores/recordings";
import { useToast } from "@/stores/toast";
import { timing } from "@/theme/motion";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";

/** Dragging the screen down past this distance minimizes it. */
const MINIMIZE_DISTANCE = 120;

/** The Record / Stop pill in the header. Only shown for live, recordable stations. */
function RecordPill() {
  const station = usePlayer((s) => s.station);
  const active = useRecordings((s) => s.active);
  const isStarting = useRecordings((s) => s.isStarting);

  if (!station) return null;
  const recording = active !== null;

  return (
    <PressableScale
      onPress={() => {
        const store = useRecordings.getState();
        if (recording) void store.stop();
        else void store.start(station);
      }}
      disabled={isStarting}
      haptic="confirm"
      accessibilityRole="button"
      accessibilityLabel={recording ? "Stop recording" : `Record ${station.name} for offline listening`}
      style={{
        height: 44,
        borderRadius: 22,
        backgroundColor: recording ? colors.alertSoft : colors.card,
        boxShadow: shadows.hairline,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 12,
        paddingRight: 14,
      }}
    >
      <Icon
        name={recording ? "stop" : "fiber_manual_record"}
        size={recording ? 18 : 16}
        color={recording ? "#AC1922" : colors.live}
        filled
      />
      <Txt variant="label" color={recording ? "#AC1922" : colors.ink}>
        {isStarting ? "Starting…" : recording ? "Stop" : "Record"}
      </Txt>
    </PressableScale>
  );
}

export default function NowPlaying() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const station = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const recording = usePlayer((s) => s.recording);
  const position = usePlayer((s) => s.position);
  const pauseReason = usePlayer((s) => s.pauseReason);
  const hasAudio = usePlayer((s) => s.hasAudio);

  const activeRecording = useRecordings((s) => s.active);
  const lastSaved = useRecordings((s) => s.lastSaved);
  const recordingFailure = useRecordings((s) => s.failure);

  // The screen has nothing to show once the station is unloaded.
  useEffect(() => {
    if (!station && router.canGoBack()) router.back();
  }, [station, router]);

  // Recording outcomes are confirmed with a toast, then cleared.
  useEffect(() => {
    if (lastSaved) {
      useToast.getState().show({
        message: "Saved for offline listening",
        icon: "download_done",
        actionLabel: "View",
        onAction: () => router.push("/recordings"),
      });
      useRecordings.getState().acknowledge();
    } else if (recordingFailure) {
      useToast.getState().show({ message: RECORDING_FAILURE_MESSAGES[recordingFailure], icon: "error" });
      useRecordings.getState().acknowledge();
    }
  }, [lastSaved, recordingFailure, router]);

  const minimize = () => {
    if (router.canGoBack()) router.back();
  };

  const dragY = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetY(14)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dragY.value > MINIMIZE_DISTANCE || e.velocityY > 1100) scheduleOnRN(minimize);
      dragY.value = withSpring(0, { damping: 24, stiffness: 240 });
    });

  const dragStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, 320], [1, 0.6], "clamp"),
    transform: [
      { translateY: dragY.value },
      { scale: interpolate(dragY.value, [0, 320], [1, 0.95], "clamp") },
    ],
  }));

  if (!station) return <Screen atmosphere="calm">{null}</Screen>;

  const subtitle = stationSubtitle(station);
  const isLoading = status === "connecting" || status === "buffering";
  const isPlaying = status === "playing";

  // Each state gets the whole screen, so it can't be mistaken for another.
  const view: "connecting" | "reconnecting" | "failed" | "player" =
    status === "error" && error
      ? "failed"
      : status === "reconnecting"
        ? "reconnecting"
        : // Only a first connection gets the Connecting screen; a brief re-buffer
          // of something already playing just shows a spinner on the button.
          isLoading && !recording && !hasAudio
          ? "connecting"
          : "player";

  const atmosphere: Atmosphere =
    view === "failed" ? "alert" : view === "reconnecting" ? "amber" : view === "connecting" ? "plain" : "calm";
  const onDark = view === "connecting";
  const showRecord = view === "player" && !recording && canRecord(station) && !station.hls;

  return (
    <Screen atmosphere={atmosphere} padTop={false}>
      <StatusBar style={onDark ? "light" : "dark"} />

      {/* Connecting is the one dark state: a deep blue that brightens toward the artwork. */}
      <MotiView
        pointerEvents="none"
        animate={{ opacity: onDark ? 1 : 0 }}
        transition={timing.slow}
        style={{ position: "absolute", inset: 0 }}
      >
        <Gradient colors={["#53B0DE", "#1E6FA6", "#0C4A7A"]} angle={180} style={{ flex: 1 }} />
      </MotiView>

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1, paddingTop: insets.top }, dragStyle]}>
          <View style={{ alignItems: "center", height: 8, justifyContent: "flex-end" }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: onDark ? "rgba(255,255,255,0.3)" : "rgba(16,17,20,0.18)",
              }}
            />
          </View>

          <View style={{ height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <IconButton
                icon="expand_more"
                iconSize={28}
                color={onDark ? colors.onInk : colors.ink}
                accessibilityLabel="Minimize player"
                onPress={minimize}
              />
            </View>

            <View style={{ alignItems: "center", gap: 5 }}>
              {view === "connecting" ? (
                <Txt variant="bodyMedium" color={colors.onInk} numberOfLines={1} style={{ opacity: 0.8 }}>
                  {station.name}
                </Txt>
              ) : (
                <>
                  <Txt variant="eyebrow" color={view === "failed" ? colors.alert : colors.inkSoft}>
                    {recording ? "Recorded" : "Live radio"}
                  </Txt>
                  <Txt variant="label" numberOfLines={1}>
                    {recording ? "Saved on this device" : "Aircircle"}
                  </Txt>
                </>
              )}
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>{showRecord ? <RecordPill /> : null}</View>
          </View>

          {/* Keyed by state so each one arrives with its own entrance. */}
          <View key={view} style={{ flex: 1 }}>
            {view === "connecting" ? (
              <ConnectingView station={station} status={status} />
            ) : view === "reconnecting" ? (
              <ReconnectingView station={station} />
            ) : view === "failed" && error ? (
              <FailureView station={station} error={error} />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 12, flexGrow: 1 }}
              >
                <View style={{ alignSelf: "center" }}>
                  <NowPlayingArt station={station} size={272} playing={isPlaying} />
                </View>

                <Rise index={1} style={{ marginTop: 34, gap: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View
                      style={{
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: recording ? colors.ink : colors.live,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingHorizontal: 10,
                      }}
                    >
                      {recording ? (
                        <Icon name="download_done" size={14} color={colors.onInk} />
                      ) : (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.onInk }} />
                      )}
                      <Txt
                        variant="tab"
                        color={colors.onInk}
                        style={{ fontFamily: fonts.sansSemibold, letterSpacing: 0.72 }}
                      >
                        {recording ? "RECORDED" : "LIVE"}
                      </Txt>
                    </View>
                    <View
                      style={{
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: colors.card,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingLeft: 7,
                        paddingRight: 10,
                      }}
                    >
                      <EqBars size={15} active={isPlaying} />
                      <Txt variant="tab" accessibilityLiveRegion="polite">
                        {isPlaying
                          ? "Playing"
                          : isLoading
                            ? "Loading"
                            : pauseReason === "external"
                              ? "Paused by your phone"
                              : status === "stopped"
                                ? "Stopped"
                                : "Paused"}
                      </Txt>
                    </View>
                  </View>

                  <Txt variant="title" accessibilityRole="header" numberOfLines={2}>
                    {station.name}
                  </Txt>
                  {recording ? (
                    <Txt variant="body" color={colors.inkSoft} style={{ lineHeight: 18 }}>
                      Playing a saved recording.
                    </Txt>
                  ) : subtitle ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Flag code={station.countryCode} />
                      <Txt
                        variant="body"
                        color={colors.inkSoft}
                        numberOfLines={1}
                        style={{ flexShrink: 1, lineHeight: 18 }}
                      >
                        {subtitle}
                      </Txt>
                    </View>
                  ) : null}
                </Rise>

                <Rise index={2} style={{ marginTop: 20 }}>
                  {recording ? (
                    <RecordedCard recording={recording} position={position} />
                  ) : activeRecording ? (
                    <RecordingCard />
                  ) : (
                    <OnAirCard />
                  )}
                </Rise>

                <Rise index={3} style={{ marginTop: 20 }}>
                  {recording ? (
                    // A saved file can be moved through; a live stream can't.
                    <View
                      style={{
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: colors.card,
                        boxShadow: shadows.card,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-evenly",
                        paddingHorizontal: 16,
                      }}
                    >
                      <IconButton
                        icon="replay_30"
                        size={52}
                        accessibilityLabel="Back 30 seconds"
                        onPress={() => usePlayer.getState().seekTo(position - 30)}
                      />
                      <PlayButton
                        size={72}
                        state={isLoading ? "loading" : isPlaying ? "pause" : "play"}
                        onPress={() => void usePlayer.getState().toggle()}
                        accessibilityLabel={isPlaying ? "Pause recording" : "Play recording"}
                      />
                      <IconButton
                        icon="forward_30"
                        size={52}
                        accessibilityLabel="Forward 30 seconds"
                        onPress={() => usePlayer.getState().seekTo(position + 30)}
                      />
                    </View>
                  ) : (
                    <ControlBar station={station} />
                  )}
                </Rise>

                <View style={{ flex: 1 }} />

                <Rise
                  index={4}
                  style={{
                    height: 50,
                    paddingHorizontal: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: insets.bottom,
                  }}
                >
                  {recording ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon name="download_done" size={18} color={colors.ok} />
                      <Txt variant="label" color={colors.inkSoft}>
                        Plays without a connection
                      </Txt>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon
                        name={isPlaying ? "check_circle" : "info"}
                        size={18}
                        color={isPlaying ? colors.ok : colors.inkSoft}
                      />
                      <Txt variant="label" color={colors.inkSoft}>
                        {isPlaying ? "Stream stable" : "Online stream"}
                      </Txt>
                    </View>
                  )}
                  {!recording && station.homepage ? (
                    <PressableScale
                      onPress={() => void Linking.openURL(station.homepage!).catch(() => {})}
                      hitSlop={12}
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${station.name} website`}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                    >
                      <Txt variant="label">Website</Txt>
                      <Icon name="arrow_outward" size={16} />
                    </PressableScale>
                  ) : null}
                </Rise>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </GestureDetector>

      {view === "player" && !recording && isPlaying ? <Coach station={station} /> : null}
    </Screen>
  );
}
