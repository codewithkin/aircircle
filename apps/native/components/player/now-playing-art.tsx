import { MotiView } from "moti";
import { View } from "react-native";

import { StationArt } from "@/components/station/station-art";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Station } from "@/lib/types";
import { springs } from "@/theme/motion";
import { shadows } from "@/theme/tokens";

type RingStyle = {
  color: string;
  dashed?: boolean;
};

type NowPlayingArtProps = {
  station: Station;
  size: number;
  /** Rings ripple outward while audio is flowing. */
  playing?: boolean;
  /** Greyed out, for reconnecting and failed states. */
  dimmed?: boolean;
  rings?: RingStyle;
  /** A round status badge on the bottom-right corner. */
  badge?: { icon: IconName; color: string; ringColor: string; spinning?: boolean };
};

/**
 * The large station artwork on Now Playing, with the two rings behind it.
 *
 * The rings are the screen's live indicator: they breathe slowly while audio
 * plays and hold still otherwise, so motion means "playing" and nothing else.
 */
export function NowPlayingArt({
  station,
  size,
  playing = false,
  dimmed = false,
  rings = { color: "rgba(255,255,255,0.85)" },
  badge,
}: NowPlayingArtProps) {
  const reduced = useReducedMotion();
  const moving = playing && !reduced;
  const inner = size + 90;
  const outer = size + 200;
  const badgeSize = Math.round(size * 0.24);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {[outer, inner].map((d, i) => (
        <MotiView
          key={`${d}-${moving}`}
          from={{ scale: 1, opacity: i === 0 ? 0.6 : 1 }}
          animate={{ scale: moving ? 1.045 : 1, opacity: moving ? (i === 0 ? 0.25 : 0.6) : i === 0 ? 0.6 : 1 }}
          transition={{
            type: "timing",
            duration: 2400,
            delay: i === 0 ? 300 : 0,
            loop: moving,
            repeatReverse: true,
          }}
          style={{
            position: "absolute",
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: 1.5,
            borderStyle: rings.dashed ? "dashed" : "solid",
            borderColor: rings.color,
          }}
        />
      ))}

      {/* The artwork settles in with a small spring when the screen opens. */}
      <MotiView
        from={{ scale: reduced ? 1 : 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs.settle}
        style={{ borderRadius: 36, boxShadow: dimmed ? undefined : shadows.art }}
      >
        <StationArt
          station={station}
          size={size}
          radius={size >= 200 ? 36 : 30}
          showName
          unavailable={dimmed}
        />
      </MotiView>

      {badge ? (
        <MotiView
          from={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springs.pop, delay: 180 }}
          style={{
            position: "absolute",
            right: -badgeSize * 0.27,
            bottom: -badgeSize * 0.27,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: badge.color,
            borderWidth: 5,
            borderColor: badge.ringColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MotiView
            from={{ rotate: "0deg" }}
            animate={{ rotate: badge.spinning && !reduced ? "360deg" : "0deg" }}
            transition={{
              type: "timing",
              duration: 1400,
              loop: !!badge.spinning && !reduced,
              repeatReverse: false,
            }}
          >
            <Icon name={badge.icon} size={Math.round(badgeSize * 0.5)} color="#FFFFFF" />
          </MotiView>
        </MotiView>
      ) : null}
    </View>
  );
}
