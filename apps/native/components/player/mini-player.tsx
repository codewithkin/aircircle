import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PlayButton } from "@/components/station/play-button";
import { StationArt } from "@/components/station/station-art";
import { Icon } from "@/components/ui/icon";
import { LiveDot } from "@/components/ui/live";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { usePresence } from "@/hooks/use-presence";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";
import { playbackLine } from "@/lib/playback/copy";
import type { Station } from "@/lib/types";
import { useNowPlaying } from "@/stores/now-playing";
import { usePlayer } from "@/stores/player";
import { useToast } from "@/stores/toast";
import { springs, timing } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";

/** How far down the card must be dragged before letting go stops playback. */
const STOP_THRESHOLD = 44;

const TONE_COLORS = {
  live: colors.inkSoft,
  muted: colors.inkSoft,
  amber: colors.amber,
  alert: colors.alert,
  recorded: colors.inkSoft,
} as const;

/**
 * The persistent player above the tab bar.
 *
 * Tap opens Now Playing, the round button plays or pauses in place, and
 * dragging the card down stops playback — with an Undo, because a downward
 * drag is easy to do by accident.
 */
export function MiniPlayer() {
  const router = useRouter();
  const reduced = useReducedMotion();

  const station = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  const pauseReason = usePlayer((s) => s.pauseReason);
  const recording = usePlayer((s) => s.recording);
  const nowPlaying = useNowPlaying((s) => s.title);

  // The last station shown, so the card still has content while it leaves.
  const [shown, setShown] = useState<Station | null>(station);
  useEffect(() => {
    if (station) setShown(station);
  }, [station]);

  const visible = station !== null;
  const mounted = usePresence(visible, 320);

  const dragY = useSharedValue(0);
  const armed = useSharedValue(false);
  const [isArmed, setIsArmed] = useState(false);

  const onArmedChange = (next: boolean) => {
    setIsArmed(next);
    // A light tick as the threshold is crossed, in either direction.
    if (next) haptics.lift();
  };

  const stop = () => {
    const player = usePlayer.getState();
    const stopped = player.station;
    const wasRecording = player.recording;
    player.dismiss();
    if (!stopped) return;

    useToast.getState().show({
      message: `Stopped ${stopped.name}`,
      icon: "stop",
      actionLabel: "Undo",
      // Undo restarts only because the listener tapped it — never on its own.
      onAction: () => {
        const p = usePlayer.getState();
        if (wasRecording) void p.playRecording(wasRecording);
        else void p.play(stopped);
      },
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY) * 0.85;
      const next = dragY.value > STOP_THRESHOLD;
      if (next !== armed.value) {
        armed.value = next;
        scheduleOnRN(onArmedChange, next);
      }
    })
    .onEnd(() => {
      if (armed.value) scheduleOnRN(stop);
      armed.value = false;
      scheduleOnRN(setIsArmed, false);
      dragY.value = withSpring(0, { damping: 22, stiffness: 260 });
    });

  const dragStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, dragY.value / STOP_THRESHOLD);
    return {
      opacity: interpolate(progress, [0, 1], [1, 0.55]),
      transform: [
        { translateY: dragY.value },
        { rotate: `${interpolate(progress, [0, 1], [0, 1])}deg` },
      ],
    };
  });

  if (!mounted || !shown) return null;

  const line = playbackLine({ status, pauseReason, recording, nowPlaying });
  const loading = status === "connecting" || status === "buffering";
  const buttonState = loading ? "loading" : status === "playing" ? "pause" : "play";

  return (
    <MotiView
      from={{ opacity: 0, translateY: reduced ? 0 : 48 }}
      animate={{ opacity: visible ? 1 : 0, translateY: visible || reduced ? 0 : 48 }}
      transition={springs.settle}
    >
      {/* The hint that appears once the card has been dragged far enough. */}
      <MotiView
        pointerEvents="none"
        animate={{ opacity: isArmed ? 1 : 0, translateY: isArmed ? 0 : 6 }}
        transition={timing.quick}
        style={{ position: "absolute", top: -26, left: 0, right: 0, alignItems: "center", zIndex: 2 }}
      >
        <View
          style={{
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.ink,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
          }}
        >
          <Icon name="stop" size={16} color={colors.onInk} filled />
          <Txt variant="captionMedium" color={colors.onInk}>
            Release to stop
          </Txt>
        </View>
      </MotiView>

      <GestureDetector gesture={pan}>
        <Animated.View style={dragStyle}>
          <PressableScale
            onPress={() => router.push("/now-playing")}
            pressedScale={0.985}
            accessibilityRole="button"
            accessibilityLabel={`${shown.name}. ${line.text}`}
            accessibilityHint="Opens Now Playing. Swipe down to stop."
            style={{
              marginTop: 8,
              marginHorizontal: 12,
              marginBottom: 6,
              height: 74,
              borderRadius: 22,
              backgroundColor: colors.card,
              boxShadow: shadows.floating,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 12,
            }}
          >
            <StationArt station={shown} size={50} radius={14} />

            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Txt variant="bodyLg" numberOfLines={1}>
                {shown.name}
              </Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {line.tone === "live" ? <LiveDot pulse /> : null}
                {line.tone === "amber" ? <Icon name="sync" size={15} color={colors.amber} /> : null}
                {line.tone === "alert" ? <Icon name="error" size={15} color={colors.alert} /> : null}
                {line.tone === "recorded" ? (
                  <Icon name="download_done" size={15} color={colors.inkSoft} />
                ) : null}
                <Txt
                  variant="caption"
                  color={TONE_COLORS[line.tone]}
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {line.text}
                </Txt>
              </View>
            </View>

            <PlayButton
              size={48}
              state={buttonState}
              onPress={() => void usePlayer.getState().toggle()}
              accessibilityLabel={status === "playing" ? `Pause ${shown.name}` : `Play ${shown.name}`}
            />
          </PressableScale>
        </Animated.View>
      </GestureDetector>
    </MotiView>
  );
}
