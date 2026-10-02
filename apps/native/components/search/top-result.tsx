import { View } from "react-native";

import { HeartButton } from "@/components/station/heart-button";
import { PlayButton } from "@/components/station/play-button";
import { EqBars } from "@/components/ui/live";
import { Gradient } from "@/components/ui/gradient";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { useStationActions } from "@/hooks/use-station-actions";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { isUnavailable, stationSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";
import { UNAVAILABLE_ART_COLORS, stationArt } from "@/theme/station-art";
import { colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

/**
 * The best match for a search, given a card of its own. It can be saved or
 * played right here; tapping the card opens the station.
 */
export function TopResult({ station }: { station: Station }) {
  const { anchorRef, open, openMenu } = useStationActions(station);
  const playback = useStationPlayback(station);
  const unavailable = isUnavailable(station);
  const subtitle = stationSubtitle(station);
  const playing = playback === "playing";

  return (
    <PressableScale
      onPress={open}
      onLongPress={openMenu}
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={[t("Top result: {{name}}", { name: station.name }), subtitle].filter(Boolean).join(", ")}
      accessibilityHint={t("Opens the station.")}
    >
      <View ref={anchorRef} collapsable={false}>
        <Gradient
          colors={unavailable ? UNAVAILABLE_ART_COLORS : stationArt(station.stationuuid).colors}
          angle={160}
          style={{
            height: 168,
            borderRadius: 28,
            overflow: "hidden",
            paddingTop: 18,
            paddingRight: 18,
            paddingBottom: 16,
            paddingLeft: 20,
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -50,
              top: -60,
              width: 220,
              height: 220,
              borderRadius: 110,
              borderWidth: 34,
              borderColor: "rgba(255,255,255,0.25)",
            }}
          />

          <Txt variant="titleSm" color={colors.onInk} numberOfLines={1}>
            {station.name}
          </Txt>
          {subtitle ? (
            <Txt
              variant="meta"
              color={colors.onInk}
              numberOfLines={1}
              style={{ marginTop: 6, opacity: 0.9 }}
            >
              {subtitle}
            </Txt>
          ) : null}

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {playing ? <EqBars size={18} color={colors.onInk} /> : null}
              <Txt variant="label" color={colors.onInk}>
                {playing
                  ? t("Playing now")
                  : playback === "loading"
                    ? t("Connecting…")
                    : unavailable
                      ? t("Offline right now")
                      : t("Live now")}
              </Txt>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <HeartButton
                station={station}
                size={48}
                color={colors.onInk}
                savedColor={colors.onInk}
                background="rgba(255,255,255,0.22)"
              />
              <PlayButton
                size={48}
                background={colors.card}
                color={colors.ink}
                state={playing ? "pause" : playback === "loading" ? "loading" : "play"}
                onPress={() => {
                  const player = usePlayer.getState();
                  if (playback === "idle") void player.play(station);
                  else void player.toggle();
                }}
                accessibilityLabel={playing ? t("Pause {{name}}", { name: station.name }) : t("Play {{name}}", { name: station.name })}
              />
            </View>
          </View>
        </Gradient>
      </View>
    </PressableScale>
  );
}
