import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
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

const RING = 290;
const STROKE = 13;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function presetLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
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
      accessibilityLabel={`${presetLabel(minutes)} sleep timer`}
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

  const running = endsAt !== null;
  const now = useNow(running ? 1000 : null);
  const remainingMs = running ? Math.max(0, endsAt - now) : chosen * 60_000;
  const fraction = running && totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 1;
  const stopsAt = running ? endsAt : now + chosen * 60_000;

  // Which preset the running countdown started from, if it matches one.
  const activePreset = running
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
              accessibilityLabel="Close sleep timer"
              onPress={() => router.back()}
            />
          </View>
          <Txt variant="bodyMedium" color={colors.onInk} accessibilityRole="header">
            Sleep timer
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
                {status === "playing" ? "Playing" : "Paused"}
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
                strokeOpacity={running ? 1 : 0.35}
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
                  running
                    ? `${Math.ceil(remainingMs / 60_000)} minutes left`
                    : `${chosen} minutes selected`
                }
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatClock(remainingMs / 1000)}
              </Txt>
              <Txt variant="body" color={colors.nightText} style={{ lineHeight: 18 }}>
                {running ? `Stops at ${formatTimeOfDay(stopsAt)}` : "Not set"}
              </Txt>
            </View>
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
              ? `Playback stops at ${formatTimeOfDay(stopsAt)}, even with the phone locked.`
              : "Start a station first — the timer stops whatever is playing."}
          </Txt>

          {running ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Turn off"
                variant="nightOutline"
                onPress={() => {
                  cancel();
                  router.back();
                }}
              />
              <Button label="Add 15 min" icon="add" variant="night" grow onPress={() => extend(15)} />
            </View>
          ) : (
            <Button
              label={`Start ${presetLabel(chosen)} timer`}
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
