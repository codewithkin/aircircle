import type { ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { HEART_COLOR } from "@/components/station/heart-button";
import { Icon } from "@/components/ui/icon";
import { haptics } from "@/lib/haptics";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";

/** How far a row travels, and how far it must go for the swipe to count. */
const MAX_TRAVEL = 96;
const COMMIT_AT = 64;

/**
 * Wraps a station row so that swiping it left saves it to Favorites (or
 * removes it, if it's already there). The heart is revealed behind the row as
 * it moves and swells once the swipe has gone far enough to count.
 *
 * The heart button on the row does the same thing with a tap, so the swipe is
 * a shortcut and never the only way.
 */
export function SwipeToFavorite({ station, children }: { station: Station; children: ReactNode }) {
  const saved = useFavorites((s) => s.stations.some((f) => f.stationuuid === station.stationuuid));

  const dragX = useSharedValue(0);
  const armed = useSharedValue(false);

  const toggle = () => useFavorites.getState().toggle(station);
  const tick = () => haptics.lift();

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    // Mostly vertical movement is the list scrolling, not a swipe.
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      dragX.value = Math.max(-MAX_TRAVEL, Math.min(0, e.translationX));
      const next = dragX.value <= -COMMIT_AT;
      if (next !== armed.value) {
        armed.value = next;
        if (next) scheduleOnRN(tick);
      }
    })
    .onEnd(() => {
      if (armed.value) scheduleOnRN(toggle);
      armed.value = false;
      dragX.value = withSpring(0, { damping: 22, stiffness: 280 });
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }] }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [-COMMIT_AT, -12, 0], [1, 0.35, 0], "clamp"),
    transform: [{ scale: interpolate(dragX.value, [-MAX_TRAVEL, -COMMIT_AT, 0], [1.25, 1, 0.6], "clamp") }],
  }));

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: COMMIT_AT,
            alignItems: "center",
            justifyContent: "center",
          },
          heartStyle,
        ]}
      >
        <Icon name="favorite" size={26} color={HEART_COLOR} filled={!saved} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
