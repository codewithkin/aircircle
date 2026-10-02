import { View } from "react-native";

import { HeartButton } from "@/components/station/heart-button";
import { StationArt } from "@/components/station/station-art";
import { Flag } from "@/components/ui/flag";
import { EqBars, LiveDot } from "@/components/ui/live";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Txt } from "@/components/ui/txt";
import { useStationActions } from "@/hooks/use-station-actions";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { isUnavailable, stationGenres, stationPlace } from "@/lib/station";
import type { Station } from "@/lib/types";
import { colors, fonts, shadows } from "@/theme/tokens";
import { t } from "@/lib/i18n";

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * A station as a card, for the lists you browse into from a place or genre.
 * More room than a row: where it is, what it plays, what it speaks, and
 * whether it's live. Tap opens the station; the heart saves without opening.
 */
export function StationListCard({ station, index = 0 }: { station: Station; index?: number }) {
  const { anchorRef, open, openMenu } = useStationActions(station);
  const playback = useStationPlayback(station);
  const unavailable = isUnavailable(station);

  const place = stationPlace(station);
  const language = station.language?.split(",").slice(0, 2).map(titleCase).join(", ");
  const detail = [stationGenres(station), language].filter(Boolean).join(" · ");
  const playing = playback === "playing";

  return (
    <Rise index={index} offset={10}>
      <PressableScale
        onPress={open}
        onLongPress={openMenu}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={[station.name, place, unavailable ? t("offline right now") : t("live now")]
          .filter(Boolean)
          .join(", ")}
        accessibilityHint={t("Opens the station.")}
        style={{
          borderRadius: 24,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: unavailable ? "#EEF0F3" : colors.card,
          boxShadow: unavailable ? undefined : shadows.card,
        }}
      >
        <View ref={anchorRef} collapsable={false}>
          <StationArt station={station} size={72} radius={20} unavailable={unavailable} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Txt variant="bodyLg" color={unavailable ? colors.inkSoft : colors.ink} numberOfLines={1}>
            {station.name}
          </Txt>
          {place ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Flag code={station.countryCode} size={11} />
              <Txt variant="caption" color={colors.inkSoft} numberOfLines={1} style={{ flexShrink: 1 }}>
                {place}
              </Txt>
            </View>
          ) : null}
          {detail ? (
            <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
              {detail}
            </Txt>
          ) : null}

          <View
            style={{
              alignSelf: "flex-start",
              height: 24,
              borderRadius: 12,
              backgroundColor: unavailable ? colors.hairline : playing ? colors.ink : colors.alertSoft,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingLeft: 8,
              paddingRight: 10,
            }}
          >
            {playing ? <EqBars size={12} color={colors.onInk} /> : unavailable ? null : <LiveDot />}
            <Txt
              variant="tab"
              color={unavailable ? colors.inkSoft : playing ? colors.onInk : "#AC1922"}
              style={{ fontFamily: fonts.sansSemibold }}
            >
              {playing
                ? t("Playing")
                : playback === "loading"
                  ? t("Connecting…")
                  : unavailable
                    ? t("Offline right now")
                    : t("Live now")}
            </Txt>
          </View>
        </View>

        {unavailable ? null : (
          <View style={{ alignSelf: "flex-start" }}>
            <HeartButton station={station} size={40} iconSize={22} background={colors.canvas} />
          </View>
        )}
      </PressableScale>
    </Rise>
  );
}
