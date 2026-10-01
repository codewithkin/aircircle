import { MotiView } from "moti";
import { View } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { colors } from "@/theme/tokens";

type LiveDotProps = {
  size?: number;
  color?: string;
  /** Adds a slow outward ripple. Only for the one dot that marks current playback. */
  pulse?: boolean;
};

/** The red dot that means "this is live". */
export function LiveDot({ size = 6, color = colors.live, pulse = false }: LiveDotProps) {
  const reduced = useReducedMotion();

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {pulse && !reduced ? (
        <MotiView
          from={{ scale: 1, opacity: 0.45 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ type: "timing", duration: 1800, loop: true, repeatReverse: false }}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      ) : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

type EqBarsProps = {
  size?: number;
  color?: string;
  /** Bars move while true and settle to a resting shape while false. */
  active?: boolean;
};

const BAR_HEIGHTS = [0.55, 1, 0.7, 0.85];
const BAR_DURATIONS = [520, 430, 610, 480];

/**
 * A small equaliser that moves while audio is playing. It does not read the
 * audio — it is a "this is the one playing" marker, not a meter — so it stays
 * small and is never the only sign of playback.
 */
export function EqBars({ size = 16, color = colors.ink, active = true }: EqBarsProps) {
  const reduced = useReducedMotion();
  const barWidth = Math.max(2, Math.round(size / 8));
  const moving = active && !reduced;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: size * 0.08,
      }}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <MotiView
          // Remounts when playback starts or stops so the loop begins and ends cleanly.
          key={`${i}-${moving}`}
          from={{ scaleY: moving ? 0.3 : h * 0.6 }}
          animate={{ scaleY: moving ? h : h * 0.6 }}
          transition={
            moving
              ? { type: "timing", duration: BAR_DURATIONS[i], loop: true, repeatReverse: true }
              : { type: "timing", duration: 200 }
          }
          style={{
            width: barWidth,
            height: size * 0.82,
            borderRadius: barWidth / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
