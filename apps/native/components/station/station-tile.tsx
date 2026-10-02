import { View } from "react-native";

import { PlayButton } from "@/components/station/play-button";
import { StationArt } from "@/components/station/station-art";
import { StationStatus } from "@/components/station/station-status";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Txt } from "@/components/ui/txt";
import { useStationActions } from "@/hooks/use-station-actions";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { isUnavailable, stationLocality, stationShortSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { colors, shadows } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type StationTileProps = {
  station: Station;
  index?: number;
  /** 132 for Recents, 104 for the compact "choose another" row. */
  size?: number;
};

/**
 * A square station tile for horizontal rows. Tapping plays the station
 * straight away — these are stations the listener already knows.
 */
export function StationTile({ station, index = 0, size = 132 }: StationTileProps) {
  const { anchorRef, play, openMenu } = useStationActions(station);
  const unavailable = isUnavailable(station);

  return (
    <Rise index={index} offset={10}>
      <PressableScale
        onPress={play}
        onLongPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t("Play {{name}}", { name: station.name })}
        accessibilityHint={t("Long press for more actions.")}
        style={{ width: size, gap: 6 }}
      >
        <View ref={anchorRef} collapsable={false}>
          <StationArt station={station} size={size} radius={24} showName unavailable={unavailable} />
        </View>
        <Txt
          variant="bodyMedium"
          color={unavailable ? colors.inkSoft : colors.ink}
          numberOfLines={1}
          style={{ marginTop: 4 }}
        >
          {station.name}
        </Txt>
        <StationStatus station={station} detail={size >= 120 ? stationLocality(station) : undefined} />
      </PressableScale>
    </Rise>
  );
}

/**
 * A larger starter card with its own Play button. Tapping the card opens the
 * station; the round button plays it without leaving the screen.
 */
export function StationCard({ station, index = 0 }: { station: Station; index?: number }) {
  const { anchorRef, open, openMenu } = useStationActions(station);
  const playback = useStationPlayback(station);
  const subtitle = stationShortSubtitle(station);

  return (
    <Rise index={index} offset={10}>
      <PressableScale
        onPress={open}
        onLongPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={[station.name, subtitle].filter(Boolean).join(", ")}
        accessibilityHint={t("Opens the station.")}
        style={{ width: 196, gap: 6 }}
      >
        <View ref={anchorRef} collapsable={false}>
          <StationArt station={station} size={196} height={150} radius={24} showName />
          <View style={{ position: "absolute", right: 10, bottom: 10 }}>
            <PlayButton
              size={44}
              background={colors.card}
              color={colors.ink}
              shadow={shadows.onArt}
              state={playback === "playing" ? "pause" : playback === "loading" ? "loading" : "play"}
              onPress={() => {
                const player = usePlayer.getState();
                if (playback === "idle") void player.play(station);
                else void player.toggle();
              }}
              accessibilityLabel={
                playback === "playing" ? t("Pause {{name}}", { name: station.name }) : t("Play {{name}}", { name: station.name })
              }
            />
          </View>
        </View>
        <Txt variant="bodyMedium" numberOfLines={1} style={{ marginTop: 4 }}>
          {station.name}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
        <StationStatus station={station} liveLabel={t("Live now")} />
      </PressableScale>
    </Rise>
  );
}
