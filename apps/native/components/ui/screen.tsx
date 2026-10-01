import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/theme/tokens";

/**
 * A soft glow of colour behind a screen's content. Each is an ellipse given as
 * fractions of the screen: where its centre sits and how far it reaches.
 */
type Glow = { color: string; cx: number; cy: number; rx: number; ry: number; reach?: number };

export type Atmosphere = "air" | "calm" | "amber" | "alert" | "night" | "offline" | "plain";

const ATMOSPHERES: Record<Atmosphere, { base: string; glows: Glow[] }> = {
  /** The default: pale blue top-right, a breath of lilac on the left. */
  air: {
    base: colors.canvas,
    glows: [
      { color: "#DAF3FE", cx: 0.85, cy: 0, rx: 0.9, ry: 0.45, reach: 0.7 },
      { color: "#F4EFFE", cx: 0, cy: 0.2, rx: 0.7, ry: 0.4, reach: 0.7 },
    ],
  },
  /** Now Playing: one wide blue glow behind the artwork. */
  calm: {
    base: colors.canvas,
    glows: [{ color: "#BAE7F5", cx: 0.5, cy: 0.3, rx: 1.2, ry: 0.6, reach: 0.75 }],
  },
  /** Reconnecting. */
  amber: {
    base: colors.amberCanvas,
    glows: [{ color: "#FAD4A0", cx: 0.5, cy: 0.3, rx: 1.1, ry: 0.6, reach: 0.75 }],
  },
  /** Station offline or failed. */
  alert: {
    base: colors.alertCanvas,
    glows: [{ color: "#FFD5D4", cx: 0.5, cy: 0.22, rx: 1.1, ry: 0.55, reach: 0.75 }],
  },
  /** Sleep timer and the dark onboarding welcome. */
  night: {
    base: colors.night,
    glows: [{ color: "#092540", cx: 0.5, cy: 0.38, rx: 0.9, ry: 0.45, reach: 1 }],
  },
  /** The device has no connection. */
  offline: {
    base: colors.nightOffline,
    glows: [{ color: "#232836", cx: 0.5, cy: 0.22, rx: 0.9, ry: 0.4, reach: 1 }],
  },
  plain: { base: colors.canvas, glows: [] },
};

type ScreenProps = {
  children: ReactNode;
  atmosphere?: Atmosphere;
  /** Pad the top by the status bar. Off for screens that draw under it. */
  padTop?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The base of every screen: the canvas colour, its glow, and the top inset.
 * The glow is one static SVG — it costs nothing after the first frame.
 */
export function Screen({ children, atmosphere = "air", padTop = true, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { base, glows } = ATMOSPHERES[atmosphere];

  return (
    <View style={[{ flex: 1, backgroundColor: base, paddingTop: padTop ? insets.top : 0 }, style]}>
      {glows.length > 0 ? (
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          <Defs>
            {glows.map((g, i) => (
              <RadialGradient key={i} id={`glow-${atmosphere}-${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={g.color} stopOpacity={1} />
                <Stop offset={g.reach ?? 0.7} stopColor={g.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {glows.map((g, i) => (
            <Ellipse
              key={i}
              cx={g.cx * 100}
              cy={g.cy * 100}
              rx={g.rx * 100}
              ry={g.ry * 100}
              fill={`url(#glow-${atmosphere}-${i})`}
            />
          ))}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
