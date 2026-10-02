import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { StationArt } from "@/components/station/station-art";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EqBars } from "@/components/ui/live";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { useNow } from "@/hooks/use-now";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatClock, formatTimeOfDay } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { usePlayer } from "@/stores/player";
import { useSettings } from "@/stores/settings";
import { SLEEP_TIMER_PRESETS_MIN, useSleepTimer } from "@/stores/sleep-timer";
import { springs, timing } from "@/theme/motion";
import { GUTTER, colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

const RING = 290;
const STROKE = 13;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** One full turn of the ring is two hours; dragging snaps to five minutes. */
const RING_MINUTES = 120;
const SNAP_MINUTES = 5;

function presetLabel(minutes: number): string {
  if (minutes < 60) return t("{{minutes}} min", { minutes });
  return minutes === 60 ? t("1 hour") : t("{{hours}} hours", { hours: minutes / 60 });
}

function Preset({
  minutes,
  selected,
  onPress,
}: {
  minutes: number;
  selected: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => {
        haptics.confirm();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t("{{length}} sleep timer", { length: presetLabel(minutes) })}
    >
      <MotiView
        animate={{
          backgroundColor: selected ? "#FFFFFF" : "rgba(255,255,255,0.08)",
          scale: pressed ? 0.95 : 1,
        }}
        transition={{ backgroundColor: timing.base, scale: springs.press }}
        style={{ height: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: "center" }}
      >
        <Txt variant="bodyMedium" color={selected ? colors.ink : colors.onInk}>
          {presetLabel(minutes)}
        </Txt>
      </MotiView>
    </Pressable>
  );
}

/**
 * The sleep timer. Always dark, so it can be set in bed without lighting up
 * the room. Tapping a preset starts or replaces the countdown straight away.
 */
export default function SleepTimer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const station = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);

  const endsAt = useSleepTimer((s) => s.endsAt);
  const totalMs = useSleepTimer((s) => s.totalMs);
  const { start, cancel, extend } = useSleepTimer.getState();
  const defaultMinutes = useSettings((s) => s.defaultSleepMinutes);

  // The preset highlighted before a timer is running.
  const [chosen, setChosen] = useState(defaultMinutes);
  // Minutes under the finger while the ring is being dragged; null otherwise.
  const [dragged, setDragged] = useState<number | null>(null);
  const lastDragged = useRef<number | null>(null);

  const running = endsAt !== null;
  const now = useNow(running ? 1000 : null);
  const dragging = dragged !== null;
  const remainingMs = dragging
    ? dragged * 60_000
    : running
      ? Math.max(0, endsAt - now)
      : chosen * 60_000;
  const fraction = dragging
    ? dragged / RING_MINUTES
    : running && totalMs > 0
      ? Math.min(1, remainingMs / totalMs)
      : 1;
  const stopsAt = dragging ? now + dragged * 60_000 : running ? endsAt : now + chosen * 60_000;

  /** Where the finger is on the ring, as minutes clockwise from 12 o'clock. */
  const minutesAt = (e: GestureResponderEvent): number => {
    const dx = e.nativeEvent.locationX - RING / 2;
    const dy = e.nativeEvent.locationY - RING / 2;
    let angle = Math.atan2(dx, -dy);
    if (angle < 0) angle += 2 * Math.PI;
    const minutes = Math.round(((angle / (2 * Math.PI)) * RING_MINUTES) / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(RING_MINUTES, Math.max(SNAP_MINUTES, minutes));
  };

  const onRingMove = (e: GestureResponderEvent) => {
    const minutes = minutesAt(e);
    if (minutes === lastDragged.current) return;
    lastDragged.current = minutes;
    // A light tick at every five-minute step.
    haptics.tap();
    setDragged(minutes);
  };

  const onRingRelease = () => {
    const minutes = lastDragged.current;
    lastDragged.current = null;
    setDragged(null);
    if (minutes === null) return;
    setChosen(minutes);
    if (station) {
      haptics.confirm();
      start(minutes);
    }
  };

  // Which preset the running countdown started from, if it matches one.
  const activePreset = dragging
    ? dragged
    : running
      ? SLEEP_TIMER_PRESETS_MIN.find((m) => m * 60_000 === totalMs)
      : chosen;

  return (
    <Screen atmosphere="night" padTop={false}>
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top }}>
        <View style={{ height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <IconButton
              icon="expand_more"
              iconSize={28}
              color={colors.onInk}
              accessibilityLabel={t("Close sleep timer")}
              onPress={() => router.back()}
            />
          </View>
          <Txt variant="bodyMedium" color={colors.onInk} accessibilityRole="header">
            {t("Sleep timer")}
          </Txt>
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 4, paddingBottom: insets.bottom + 10 }}
      >
        {station ? (
          <Rise
            style={{
              alignSelf: "center",
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.06)",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingLeft: 6,
              paddingRight: 16,
              maxWidth: "88%",
            }}
          >
            <StationArt station={station} size={32} radius={16} />
            <Txt variant="label" color={colors.onInk} numberOfLines={1} style={{ flexShrink: 1 }}>
              {station.name}
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <EqBars size={15} color={colors.nightText} active={status === "playing"} />
              <Txt variant="caption" color={colors.nightText}>
                {status === "playing" ? t("Playing") : t("Paused")}
              </Txt>
            </View>
          </Rise>
        ) : null}

        {/* The ring drains as time runs out; the number in the middle is the truth. */}
        <Rise index={1} offset={0} style={{ alignSelf: "center", marginTop: 30 }}>
          <MotiView
            from={{ scale: reduced ? 1 : 0.92 }}
            animate={{ scale: 1 }}
            transition={springs.settle}
            style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}
          >
            <View
              style={{
                position: "absolute",
                width: RING + 52,
                height: RING + 52,
                borderRadius: (RING + 52) / 2,
                borderWidth: 1,
                borderColor: "rgba(160,200,255,0.1)",
              }}
            />
            <Svg width={RING} height={RING} style={{ position: "absolute" }}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={STROKE}
                fill="none"
              />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RADIUS}
                stroke={colors.nightAccent}
                strokeOpacity={running || dragging ? 1 : 0.35}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
                // Start at 12 o'clock and drain clockwise.
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>

            <View style={{ alignItems: "center", gap: 10 }}>
              <Icon name="bedtime" size={26} color={colors.nightAccent} />
              <Txt
                variant="timer"
                color={colors.onInk}
                accessibilityLabel={
                  running && !dragging
                    ? t("{{minutes}} minutes left", { minutes: Math.ceil(remainingMs / 60_000) })
                    : t("{{minutes}} minutes selected", { minutes: dragging ? dragged : chosen })
                }
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatClock(remainingMs / 1000)}
              </Txt>
              <Txt variant="body" color={colors.nightText} style={{ lineHeight: 18 }}>
                {dragging
                  ? t("Release to stop at {{time}}", { time: formatTimeOfDay(stopsAt) })
                  : running
                    ? t("Stops at {{time}}", { time: formatTimeOfDay(stopsAt) })
                    : t("Drag the ring or pick a time")}
              </Txt>
            </View>

            {/* Drag anywhere on the ring to set a custom time. Sits above the
                dial so touch positions are measured against the ring itself. */}
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={t("Sleep timer length")}
              accessibilityValue={{ text: t("{{minutes}} minutes", { minutes: dragging ? dragged : chosen }) }}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={(e) => {
                const base = running ? Math.ceil(remainingMs / 60_000) : chosen;
                const step = e.nativeEvent.actionName === "increment" ? SNAP_MINUTES : -SNAP_MINUTES;
                const next = Math.min(RING_MINUTES, Math.max(SNAP_MINUTES, base + step));
                setChosen(next);
                if (station) start(next);
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={onRingMove}
              onResponderMove={onRingMove}
              onResponderRelease={onRingRelease}
              onResponderTerminate={onRingRelease}
              style={{ position: "absolute", width: RING, height: RING, borderRadius: RING / 2 }}
            />
          </MotiView>
        </Rise>

        <Rise index={2} style={{ marginTop: 40 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }}
          >
            {SLEEP_TIMER_PRESETS_MIN.map((minutes) => (
              <Preset
                key={minutes}
                minutes={minutes}
                selected={activePreset === minutes}
                onPress={() => {
                  setChosen(minutes);
                  // With a countdown running, a preset replaces it on the spot.
                  if (running) start(minutes);
                }}
              />
            ))}
          </ScrollView>
        </Rise>

        <View style={{ flex: 1, minHeight: 24 }} />

        <Rise index={3} style={{ paddingHorizontal: GUTTER }}>
          <Txt
            variant="caption"
            color={colors.nightText}
            style={{ textAlign: "center", marginBottom: 16, lineHeight: 19 }}
          >
            {station
              ? t("Playback stops at {{time}}, even with the phone locked.", { time: formatTimeOfDay(stopsAt) })
              : t("Start a station first — the timer stops whatever is playing.")}
          </Txt>

          {running ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label={t("Turn off")}
                variant="nightOutline"
                onPress={() => {
                  cancel();
                  router.back();
                }}
              />
              <Button label={t("Add 15 min")} icon="add" variant="night" grow onPress={() => extend(15)} />
            </View>
          ) : (
            <Button
              label={t("Start {{length}} timer", { length: presetLabel(chosen) })}
              icon="bedtime"
              variant="night"
              disabled={!station}
              onPress={() => start(chosen)}
            />
          )}
        </Rise>
      </ScrollView>
    </Screen>
  );
}
