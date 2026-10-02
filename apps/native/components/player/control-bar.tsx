import { useRouter } from "expo-router";
import { View } from "react-native";

import { HeartButton } from "@/components/station/heart-button";
import { PlayButton } from "@/components/station/play-button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { useNow } from "@/hooks/use-now";
import { formatRemaining } from "@/lib/format";
import { share } from "@/components/player/share-sheet";
import type { Station } from "@/lib/types";
import { useNowPlaying } from "@/stores/now-playing";
import { usePlayer } from "@/stores/player";
import { useReport } from "@/stores/report";
import { useSleepTimer } from "@/stores/sleep-timer";
import { colors, fonts, shadows } from "@/theme/tokens";
import { t } from "@/lib/i18n";

function BarButton({
  icon,
  label,
  onPress,
  caption,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** A tiny value under the icon, e.g. the time left on the sleep timer. */
  caption?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", gap: 3 }}
    >
      <Icon name={icon} size={24} />
      {caption ? (
        <Txt
          variant="tab"
          color={colors.amber}
          style={{ fontFamily: fonts.sansSemibold, fontSize: 11, lineHeight: 12 }}
        >
          {caption}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

/**
 * Now Playing's controls: timer, favorite, the large Play/Pause, share and
 * report. Deliberately no seek bar and no skip buttons — this is live radio.
 */
export function ControlBar({ station }: { station: Station }) {
  const router = useRouter();
  const status = usePlayer((s) => s.status);
  const timerEndsAt = useSleepTimer((s) => s.endsAt);
  // Only tick while a timer is actually running.
  const now = useNow(timerEndsAt ? 15_000 : null);

  const loading = status === "connecting" || status === "buffering";
  const playing = status === "playing";

  return (
    <View
      style={{
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.card,
        boxShadow: shadows.card,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
      }}
    >
      <BarButton
        icon="bedtime"
        label={
          timerEndsAt
            ? t("Sleep timer, {{time}} left", { time: formatRemaining(timerEndsAt - now) })
            : t("Set a sleep timer")
        }
        caption={timerEndsAt ? formatRemaining(timerEndsAt - now) : undefined}
        onPress={() => router.push("/sleep-timer")}
      />

      <HeartButton station={station} size={52} color={colors.ink} savedColor="#AE316E" />

      <PlayButton
        size={72}
        state={loading ? "loading" : playing ? "pause" : "play"}
        onPress={() => void usePlayer.getState().toggle()}
        accessibilityLabel={playing ? t("Pause {{name}}", { name: station.name }) : t("Play {{name}}", { name: station.name })}
      />

      <BarButton
        icon="ios_share"
        label={t("Share {{name}}", { name: station.name })}
        onPress={() => {
          // A fresh title is offered as an opt-in, never included by default.
          share(station, useNowPlaying.getState().title);
        }}
      />

      <BarButton
        icon="flag"
        label={t("Report a problem with {{name}}", { name: station.name })}
        onPress={() => useReport.getState().open(station)}
      />
    </View>
  );
}
