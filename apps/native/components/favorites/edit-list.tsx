import { MotiView } from "moti";
import { useEffect, useLayoutEffect, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { StationArt } from "@/components/station/station-art";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { haptics } from "@/lib/haptics";
import { stationShortSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { timing } from "@/theme/motion";
import { colors, fonts, shadows } from "@/theme/tokens";

const ROW_HEIGHT = 72;
const ROW_GAP = 8;
const STEP = ROW_HEIGHT + ROW_GAP;

/** How long a removed favorite can still be brought back. */
const UNDO_SECONDS = 4;

const SPRING = { damping: 24, stiffness: 300 };

type RowProps = {
  station: Station;
  index: number;
  count: number;
  /** Index of the row being dragged, or -1. */
  activeIndex: SharedValue<number>;
  /** How far the dragged row has moved from its slot. */
  dragY: SharedValue<number>;
  onDrop: (from: number, to: number) => void;
  onRemove: (station: Station) => void;
};

function Row({ station, index, count, activeIndex, dragY, onDrop, onRemove }: RowProps) {
  const subtitle = stationShortSubtitle(station);

  const pan = Gesture.Pan()
    .onBegin(() => {
      activeIndex.value = index;
      dragY.value = 0;
      scheduleOnRN(haptics.lift);
    })
    .onUpdate((e) => {
      // Can't be dragged past the first or last slot.
      dragY.value = Math.max(-index * STEP, Math.min((count - 1 - index) * STEP, e.translationY));
    })
    .onFinalize(() => {
      if (activeIndex.value !== index) return;
      const target = Math.max(0, Math.min(count - 1, Math.round(index + dragY.value / STEP)));
      // Settle into the slot first, then commit the new order.
      dragY.value = withSpring((target - index) * STEP, SPRING, () => {
        scheduleOnRN(onDrop, index, target);
      });
    });

  const style = useAnimatedStyle(() => {
    const active = activeIndex.value;

    if (active === index) {
      return {
        zIndex: 2,
        boxShadow: shadows.lifted,
        transform: [{ translateY: dragY.value }, { rotate: "-1.5deg" }, { scale: 1.02 }],
      };
    }

    // Rows between the dragged row's origin and its current slot step aside.
    let shift = 0;
    if (active >= 0) {
      const target = Math.round(active + dragY.value / STEP);
      if (active < index && index <= target) shift = -STEP;
      else if (target <= index && index < active) shift = STEP;
    }

    return {
      zIndex: 0,
      boxShadow: shadows.hairline,
      transform: [
        { translateY: active >= 0 ? withSpring(shift, SPRING) : 0 },
        { rotate: "0deg" },
        { scale: 1 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: ROW_HEIGHT,
          borderRadius: 20,
          backgroundColor: colors.card,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingLeft: 12,
          paddingRight: 6,
        },
        style,
      ]}
    >
      <PressableScale
        onPress={() => onRemove(station)}
        pressedScale={0.85}
        haptic="confirm"
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${station.name} from Favorites`}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#FFECE9",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="remove" size={18} color={colors.alert} />
      </PressableScale>

      <StationArt station={station} size={44} radius={13} />

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt variant="bodyMedium" numberOfLines={1}>
          {station.name}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>

      <Txt variant="tab" color={colors.inkFaint} style={{ fontFamily: fonts.mono }}>
        {String(index + 1).padStart(2, "0")}
      </Txt>

      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Reorder ${station.name}, position ${index + 1} of ${count}`}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            // Screen readers move a row one place at a time instead of dragging.
            const to = e.nativeEvent.actionName === "increment" ? index + 1 : index - 1;
            if (to >= 0 && to < count) onDrop(index, to);
          }}
          style={{ width: 40, height: 56, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="drag_indicator" size={24} color={colors.inkFaint} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/** The red row that stands in for a removed favorite while Undo is possible. */
function RemovedRow({
  station,
  secondsLeft,
  onUndo,
}: {
  station: Station;
  secondsLeft: number;
  onUndo: () => void;
}) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={timing.base}
    >
      <Gradient
        colors={["#DE3C37", "#C42942"]}
        angle={100}
        style={{
          height: ROW_HEIGHT,
          borderRadius: 20,
          overflow: "hidden",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingLeft: 12,
          paddingRight: 10,
          boxShadow: "0 16px 30px -16px rgba(187,6,30,0.75)",
        }}
      >
        <View
          style={{
            position: "absolute",
            right: 78,
            top: -48,
            width: 124,
            height: 124,
            borderRadius: 62,
            borderWidth: 16,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        />
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 4,
            borderColor: "rgba(255,255,255,0.85)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt variant="bodyLg" color={colors.onInk} style={{ fontFamily: fonts.sansSemibold }}>
            {secondsLeft}
          </Txt>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt variant="bodyMedium" color={colors.onInk} numberOfLines={1}>
            {station.name} removed
          </Txt>
          <Txt variant="caption" color="rgba(255,255,255,0.88)" accessibilityLiveRegion="polite">
            Gone from Favorites in {secondsLeft} s
          </Txt>
        </View>
        <PressableScale
          onPress={onUndo}
          haptic="confirm"
          accessibilityRole="button"
          accessibilityLabel={`Undo removing ${station.name}`}
          style={{
            height: 42,
            borderRadius: 21,
            backgroundColor: colors.card,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingLeft: 12,
            paddingRight: 16,
          }}
        >
          <Icon name="undo" size={18} color="#B00A1D" />
          <Txt variant="label" color="#B00A1D" style={{ fontFamily: fonts.sansSemibold }}>
            Undo
          </Txt>
        </PressableScale>
      </Gradient>
    </MotiView>
  );
}

/**
 * Favorites in edit mode: drag a handle to reorder, tap minus to remove. A
 * removed row turns red in place with Undo and a countdown before it goes.
 */
export function EditList() {
  const stations = useFavorites((s) => s.stations);

  const activeIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);

  // The favorite that has been removed but can still be undone, and its slot.
  const [removed, setRemoved] = useState<{ station: Station; index: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS);

  // Once the new order has rendered, the drag offsets no longer apply.
  useLayoutEffect(() => {
    activeIndex.value = -1;
    dragY.value = 0;
  }, [stations, activeIndex, dragY]);

  useEffect(() => {
    if (!removed) return;
    setSecondsLeft(UNDO_SECONDS);
    const tick = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    const done = setTimeout(() => setRemoved(null), UNDO_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [removed]);

  const onDrop = (from: number, to: number) => {
    if (from === to) {
      activeIndex.value = -1;
      dragY.value = withTiming(0, { duration: 120 });
      return;
    }
    haptics.confirm();
    useFavorites.getState().move(from, to);
  };

  const onRemove = (station: Station) => {
    const index = stations.findIndex((s) => s.stationuuid === station.stationuuid);
    useFavorites.getState().remove(station.stationuuid);
    setRemoved({ station, index });
  };

  const undo = () => {
    if (!removed) return;
    // Back exactly where it was, not at the end.
    useFavorites.getState().add(removed.station, removed.index);
    setRemoved(null);
  };

  // Rows above the removed slot, the red row, then the rest.
  const removedAt = removed ? Math.min(removed.index, stations.length) : -1;

  // The dashed outline that marks where the dragged row will land. The red
  // "removed" row takes up a slot of its own, so slots after it sit one lower.
  const slotStyle = useAnimatedStyle(() => {
    const active = activeIndex.value;
    if (active < 0) return { opacity: withTiming(0, { duration: 120 }) };
    const target = Math.round(active + dragY.value / STEP);
    const offset = removedAt >= 0 && target >= removedAt ? 1 : 0;
    return {
      opacity: withTiming(1, { duration: 120 }),
      transform: [{ translateY: (target + offset) * STEP }],
    };
  });

  // One flat list of children, so a dragged row can rise above every other row.
  const rows: React.ReactNode[] = [];
  stations.forEach((station, i) => {
    if (removed && i === removedAt) {
      rows.push(
        <RemovedRow key="removed" station={removed.station} secondsLeft={secondsLeft} onUndo={undo} />,
      );
    }
    rows.push(
      <Row
        key={station.stationuuid}
        station={station}
        index={i}
        count={stations.length}
        activeIndex={activeIndex}
        dragY={dragY}
        onDrop={onDrop}
        onRemove={onRemove}
      />,
    );
  });
  if (removed && removedAt >= stations.length) {
    rows.push(
      <RemovedRow key="removed" station={removed.station} secondsLeft={secondsLeft} onUndo={undo} />,
    );
  }

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: ROW_HEIGHT,
            borderRadius: 20,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: "#C9CCD4",
          },
          slotStyle,
        ]}
      />

      <View style={{ gap: ROW_GAP }}>{rows}</View>
    </View>
  );
}
