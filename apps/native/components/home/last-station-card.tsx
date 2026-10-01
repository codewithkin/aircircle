import { View } from "react-native";

import { StationArt } from "@/components/station/station-art";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useStationActions } from "@/hooks/use-station-actions";
import { stationSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { colors, shadows } from "@/theme/tokens";

/**
 * "Resume last station" — shown on Home when a station is loaded but stopped.
 * Nothing plays until Resume is tapped; the app never restarts audio itself.
 */
export function LastStationCard({ station }: { station: Station }) {
  const { anchorRef, openMenu } = useStationActions(station);
  const isFavorite = useFavorites((s) =>
    s.stations.some((f) => f.stationuuid === station.stationuuid),
  );
  const subtitle = stationSubtitle(station);

  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: colors.card,
        boxShadow: shadows.card,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View ref={anchorRef} collapsable={false}>
          <StationArt station={station} size={96} radius={22} showName />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Eyebrow>Last station</Eyebrow>
          <Txt variant="heading" numberOfLines={2} style={{ fontSize: 19, marginTop: 2 }}>
            {station.name}
          </Txt>
          {subtitle ? (
            <Txt variant="meta" color={colors.inkSoft} numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
          {isFavorite ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name="favorite" size={16} filled />
              <Txt variant="captionMedium">In Favorites</Txt>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <Button
          label="Resume"
          icon="play_arrow"
          iconFilled
          height={52}
          grow
          onPress={() => void usePlayer.getState().resume()}
          accessibilityLabel={`Resume ${station.name}`}
        />
        <IconButton
          icon="more_horiz"
          size={52}
          background={colors.chip}
          onPress={openMenu}
          accessibilityLabel={`More actions for ${station.name}`}
        />
      </View>

      <Txt variant="caption" color={colors.inkSoft} style={{ marginTop: 12 }}>
        We’ll remember this station here.
      </Txt>
    </View>
  );
}
