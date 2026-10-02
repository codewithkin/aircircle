import { View } from "react-native";

import { EqBars } from "@/components/ui/live";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Txt } from "@/components/ui/txt";
import { useStationActions } from "@/hooks/use-station-actions";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { isUnavailable } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { UNAVAILABLE_ART_COLORS, stationArt } from "@/theme/station-art";
import { colors, fonts } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type PresetProps = {
  station: Station;
  /** Zero-based position; shown as 01, 02, … */
  index: number;
  onLongPress: () => void;
};

/**
 * One favorite, as a radio preset: a numbered button that plays its station.
 * The one that's playing is outlined, so it's findable at a glance.
 */
function Preset({ station, index, onLongPress }: PresetProps) {
  const { open } = useStationActions(station);
  const playback = useStationPlayback(station);
  const unavailable = isUnavailable(station) || playback === "error";
  const active = playback === "playing" || playback === "loading" || playback === "reconnecting";

  return (
    <Rise index={index} offset={10} style={{ width: "48.2%" }}>
      <PressableScale
        onPress={() => {
          // A station that needs attention opens its detail, where Retry,
          // Report and Remove are one tap away.
          if (unavailable) return open();
          const player = usePlayer.getState();
          if (playback === "idle") void player.play(station);
          else void player.toggle();
        }}
        onLongPress={onLongPress}
        haptic="confirm"
        accessibilityRole="button"
        accessibilityLabel={`Preset ${index + 1}: ${station.name}${
          unavailable ? t(", needs attention") : active ? t(", playing") : ""
        }`}
        accessibilityHint={t("Plays the station. Long press to reorder.")}
        style={{
          borderRadius: 31,
          padding: 3,
          borderWidth: 2.5,
          borderColor: active ? colors.ink : "transparent",
        }}
      >
        <Gradient
          colors={unavailable ? UNAVAILABLE_ART_COLORS : stationArt(station.stationuuid).colors}
          angle={160}
          style={{
            height: 150,
            borderRadius: 26,
            overflow: "hidden",
            paddingVertical: 14,
            paddingHorizontal: 16,
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -30,
              top: -36,
              width: 130,
              height: 130,
              borderRadius: 65,
              borderWidth: 18,
              borderColor: "rgba(255,255,255,0.28)",
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt
              variant="captionMedium"
              color={colors.onInk}
              style={{ fontFamily: fonts.mono, opacity: 0.85 }}
            >
              {String(index + 1).padStart(2, "0")}
            </Txt>

            {unavailable ? (
              <View
                style={{
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: colors.amberSoft,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingLeft: 7,
                  paddingRight: 9,
                }}
              >
                <Icon name="error" size={14} color={colors.amber} />
                <Txt variant="tab" color={colors.amber} style={{ fontFamily: fonts.sansSemibold }}>
                  {t("Needs attention")}
                </Txt>
              </View>
            ) : active ? (
              <View
                style={{
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: colors.card,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingLeft: 7,
                  paddingRight: 9,
                }}
              >
                <EqBars size={14} active={playback === "playing"} />
                <Txt variant="tab">{playback === "playing" ? t("Playing") : t("Connecting")}</Txt>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 4 }}>
            <Txt
              variant="heading"
              color={colors.onInk}
              numberOfLines={2}
              style={{ fontFamily: fonts.sansSemibold, lineHeight: 20 }}
            >
              {station.name}
            </Txt>
            {unavailable ? (
              <Txt variant="tab" color={colors.ink} style={{ opacity: 0.8 }}>
                {t("Tap to retry or remove")}
              </Txt>
            ) : null}
          </View>
        </Gradient>
      </PressableScale>
    </Rise>
  );
}

export function PresetGrid({
  stations,
  onLongPress,
}: {
  stations: Station[];
  onLongPress: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 6,
        // The outline ring sits outside each tile; pull the grid back to the gutter.
        marginHorizontal: -5.5,
      }}
    >
      {stations.map((station, i) => (
        <Preset key={station.stationuuid} station={station} index={i} onLongPress={onLongPress} />
      ))}
    </View>
  );
}
