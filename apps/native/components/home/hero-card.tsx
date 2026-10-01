import { MotiView } from "moti";
import { View } from "react-native";

import { Flag } from "@/components/ui/flag";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useStationActions } from "@/hooks/use-station-actions";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { stationPlace } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { colors } from "@/theme/tokens";

/**
 * The featured station on Home: a warm card with one clear Listen button.
 * Tapping the card opens the station; Listen plays it without leaving Home.
 */
export function HeroCard({ station }: { station: Station }) {
  const { anchorRef, open, openMenu } = useStationActions(station);
  const playback = useStationPlayback(station);
  const reduced = useReducedMotion();
  const place = stationPlace(station);
  const playing = playback === "playing";

  return (
    <PressableScale
      onPress={open}
      onLongPress={openMenu}
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`Featured station: ${station.name}${place ? `, ${place}` : ""}`}
      accessibilityHint="Opens the station."
    >
      <View ref={anchorRef} collapsable={false}>
        <Gradient
          colors={["#ECCB9E", "#D77E49"]}
          angle={150}
          style={{ height: 208, borderRadius: 28, overflow: "hidden", padding: 20 }}
        >
          {/* The big ring drifts very slightly — the one piece of ambient motion on Home. */}
          <MotiView
            from={{ rotate: "0deg" }}
            animate={{ rotate: reduced ? "0deg" : "360deg" }}
            transition={{ type: "timing", duration: 60000, loop: !reduced, repeatReverse: false }}
            style={{ position: "absolute", right: -60, top: -70, width: 250, height: 250 }}
          >
            <View
              style={{
                width: 250,
                height: 250,
                borderRadius: 125,
                borderWidth: 40,
                borderColor: "rgba(255,255,255,0.22)",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: 30,
                top: 100,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(255,255,255,0.4)",
              }}
            />
          </MotiView>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.onInk }} />
            <Txt variant="eyebrow" color={colors.onInk}>
              Live now · For you
            </Txt>
          </View>

          <View style={{ flex: 1 }} />

          <Txt variant="titleSm" color={colors.onInk} numberOfLines={2} style={{ maxWidth: 240 }}>
            {station.name}
          </Txt>

          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Flag code={station.countryCode} />
              <Txt
                variant="meta"
                color={colors.onInk}
                numberOfLines={1}
                style={{ flexShrink: 1, opacity: 0.9 }}
              >
                {place || "Live radio"}
              </Txt>
            </View>

            <PressableScale
              onPress={() => {
                const player = usePlayer.getState();
                if (playback === "idle") void player.play(station);
                else void player.toggle();
              }}
              haptic="confirm"
              accessibilityRole="button"
              accessibilityLabel={playing ? `Pause ${station.name}` : `Listen to ${station.name}`}
              style={{
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.card,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingLeft: 16,
                paddingRight: 22,
              }}
            >
              <Icon
                name={
                  playback === "loading" ? "progress_activity" : playing ? "pause" : "play_arrow"
                }
                size={22}
                filled
              />
              <Txt variant="bodyLg">{playing ? "Pause" : "Listen"}</Txt>
            </PressableScale>
          </View>
        </Gradient>
      </View>
    </PressableScale>
  );
}
