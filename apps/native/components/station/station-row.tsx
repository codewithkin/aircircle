import { View } from "react-native";

import { HeartButton } from "@/components/station/heart-button";
import { PlayButton } from "@/components/station/play-button";
import { StationArt } from "@/components/station/station-art";
import { StationStatus } from "@/components/station/station-status";
import { SwipeToFavorite } from "@/components/station/swipe-to-favorite";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Txt } from "@/components/ui/txt";
import { useStationActions } from "@/hooks/use-station-actions";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { isUnavailable, stationSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type StationRowProps = {
  station: Station;
  /** Position in the list, for the staggered entrance. */
  index?: number;
  /** What sits at the right edge. */
  trailing?: "heart" | "play" | "none";
  /** Draw the hairline under the row. Off for the last row in a group. */
  divider?: boolean;
  /** Tap behaviour. Rows open the station by default. */
  onPress?: () => void;
  onDark?: boolean;
  /** Swiping the row left saves or unsaves the station. */
  swipeToFavorite?: boolean;
};

/**
 * A station in a list: artwork, name, where and what, and its live state.
 * Tap opens the station, long-press opens the quick menu.
 */
export function StationRow({
  station,
  index = 0,
  trailing = "heart",
  divider = true,
  onPress,
  onDark = false,
  swipeToFavorite = false,
}: StationRowProps) {
  const { anchorRef, open, openMenu } = useStationActions(station);
  const playback = useStationPlayback(station);
  const unavailable = isUnavailable(station);
  const subtitle = stationSubtitle(station);

  const row = (
      <PressableScale
        onPress={onPress ?? open}
        onLongPress={openMenu}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={[station.name, subtitle, unavailable ? t("offline right now") : ""]
          .filter(Boolean)
          .join(", ")}
        accessibilityHint={t("Opens the station. Long press for more actions.")}
        style={{
          minHeight: 76,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: onDark ? "rgba(255,255,255,0.08)" : colors.hairline,
        }}
      >
        <View ref={anchorRef} collapsable={false}>
          <StationArt station={station} size={52} radius={15} unavailable={unavailable} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 4, paddingVertical: 10 }}>
          <Txt
            variant="bodyLg"
            color={unavailable ? colors.inkSoft : onDark ? colors.onInk : colors.ink}
            numberOfLines={1}
          >
            {station.name}
          </Txt>
          {subtitle ? (
            <Txt variant="meta" color={onDark ? colors.nightFaint : colors.inkSoft} numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
          <StationStatus station={station} onDark={onDark} />
        </View>

        {trailing === "heart" ? <HeartButton station={station} /> : null}
        {trailing === "play" ? (
          <PlayButton
            size={44}
            background={colors.signalSoft}
            color={colors.signal}
            state={playback === "playing" ? "pause" : playback === "loading" ? "loading" : "play"}
            onPress={() => {
              const player = usePlayer.getState();
              if (playback === "idle") void player.play(station);
              else void player.toggle();
            }}
            disabled={unavailable}
            accessibilityLabel={playback === "playing" ? t("Pause {{name}}", { name: station.name }) : t("Play {{name}}", { name: station.name })}
          />
        ) : null}
      </PressableScale>
  );

  return (
    <Rise index={index} offset={10}>
      {swipeToFavorite ? <SwipeToFavorite station={station}>{row}</SwipeToFavorite> : row}
    </Rise>
  );
}
