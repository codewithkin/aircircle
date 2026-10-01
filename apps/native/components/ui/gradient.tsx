import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

type GradientProps = {
  colors: readonly [string, string, ...string[]];
  /** CSS gradient angle: 0 points up, 90 right, 180 down. */
  angle?: number;
  locations?: readonly [number, number, ...number[]];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A linear gradient that takes its direction the way the designs give it — as
 * a CSS angle — rather than as start and end points.
 */
export function Gradient({ colors, angle = 160, locations, style, children }: GradientProps) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad) / 2;
  const dy = -Math.cos(rad) / 2;

  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{ x: 0.5 - dx, y: 0.5 - dy }}
      end={{ x: 0.5 + dx, y: 0.5 + dy }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
