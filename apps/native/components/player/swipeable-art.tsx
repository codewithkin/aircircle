import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { NowPlayingArt } from "@/components/player/now-playing-art";
import { Txt } from "@/components/ui/txt";
import { haptics } from "@/lib/haptics";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { colors, fonts } from "@/theme/tokens";

/** How far the artwork must be dragged sideways to change station. */
const SWIPE_DISTANCE = 90;

type SwipeableArtProps = {
  station: Station;
  size: number;
  playing: boolean;
};

/**
 * The Now Playing artwork. When the station is one of the listener's
 * favorites, swiping it left or right moves to the next or previous preset —
 * like turning a dial through saved stations.
 *
 * For any other station there is nothing to move between, so it doesn't move.
 */
export function SwipeableArt({ station, size, playing }: SwipeableArtProps) {
  const favorites = useFavorites((s) => s.stations);
  const index = favorites.findIndex((f) => f.stationuuid === station.stationuuid);
  const canSwipe = index >= 0 && favorites.length > 1;

  const dragX = useSharedValue(0);

  const move = (direction: 1 | -1) => {
    const next = favorites[(index + direction + favorites.length) % favorites.length];
    if (!next) return;
    haptics.confirm();
    void usePlayer.getState().play(next);
  };

  const pan = Gesture.Pan()
    .enabled(canSwipe)
    .activeOffsetX([-16, 16])
    // A mostly vertical drag belongs to "swipe down to minimize", not to this.
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      dragX.value = e.translationX * 0.6;
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > 800;
      if (far) scheduleOnRN(move, e.translationX < 0 ? 1 : -1);
      dragX.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dragX.value), [0, 120], [1, 0.6], "clamp"),
    transform: [
      { translateX: dragX.value },
      { rotate: `${interpolate(dragX.value, [-120, 120], [-4, 4], "clamp")}deg` },
    ],
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={style}
          accessible={canSwipe}
          accessibilityRole={canSwipe ? "adjustable" : undefined}
          accessibilityLabel={
            canSwipe ? `Favorite ${index + 1} of ${favorites.length}: ${station.name}` : undefined
          }
          accessibilityActions={canSwipe ? [{ name: "increment" }, { name: "decrement" }] : undefined}
          onAccessibilityAction={(e) => move(e.nativeEvent.actionName === "increment" ? 1 : -1)}
        >
          {/* Keyed by station so the artwork springs in fresh after each swipe. */}
          <NowPlayingArt key={station.stationuuid} station={station} size={size} playing={playing} />
        </Animated.View>
      </GestureDetector>

      {canSwipe ? (
        <Txt
          variant="tab"
          color={colors.inkFaint}
          accessible={false}
          style={{ fontFamily: fonts.mono, marginTop: 14, letterSpacing: 0.5 }}
        >
          {`‹  ${String(index + 1).padStart(2, "0")} / ${String(favorites.length).padStart(2, "0")}  ›`}
        </Txt>
      ) : null}
    </View>
  );
}
