import { MotiView } from "moti";
import { View } from "react-native";
import type { DimensionValue } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { colors } from "@/theme/tokens";

type SkeletonProps = {
  width: DimensionValue;
  height: number;
  radius?: number;
  /** For dark surfaces. */
  onDark?: boolean;
};

/**
 * A placeholder block that breathes while content loads, so a screen waiting
 * on the directory never looks stalled.
 */
export function Skeleton({ width, height, radius = 12, onDark = false }: SkeletonProps) {
  const reduced = useReducedMotion();

  return (
    <MotiView
      from={{ opacity: reduced ? 0.7 : 0.45 }}
      animate={{ opacity: reduced ? 0.7 : 1 }}
      transition={{ type: "timing", duration: 850, loop: !reduced, repeatReverse: true }}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: onDark ? "rgba(255,255,255,0.08)" : colors.chip,
      }}
    />
  );
}

/** Stand-in for a row of station tiles. */
export function TileRowSkeleton({ size = 132, count = 3 }: { size?: number; count?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Skeleton width={size} height={size} radius={24} />
          <Skeleton width={size * 0.7} height={12} radius={6} />
          <Skeleton width={size * 0.45} height={10} radius={5} />
        </View>
      ))}
    </View>
  );
}

/** Stand-in for a list of station rows. */
export function RowListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: 76, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Skeleton width={52} height={52} radius={15} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="62%" height={13} radius={6} />
            <Skeleton width="40%" height={11} radius={5} />
          </View>
        </View>
      ))}
    </View>
  );
}
