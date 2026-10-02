import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { EqBars, LiveDot } from "@/components/ui/live";
import { Txt } from "@/components/ui/txt";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { isUnavailable } from "@/lib/station";
import type { Station } from "@/lib/types";
import { colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type StationStatusProps = {
  station: Station;
  /** Appended after "Live": a city, or the current title. */
  detail?: string;
  /** The word used for a station that's simply on air. */
  liveLabel?: string;
  /** For dark surfaces. */
  onDark?: boolean;
};

/**
 * The one-line state under a station's name: Playing, Live, Connecting, or
 * Offline. Always an icon and a word together — never colour alone.
 */
export function StationStatus({
  station,
  detail,
  liveLabel = t("Live"),
  onDark = false,
}: StationStatusProps) {
  const playback = useStationPlayback(station);
  const soft = onDark ? colors.nightText : colors.inkSoft;
  const strong = onDark ? colors.onInk : colors.ink;

  let content;

  if (playback === "playing") {
    content = (
      <>
        <EqBars size={16} color={strong} />
        <Txt variant="captionMedium" color={strong}>
          {t("Playing")}
        </Txt>
      </>
    );
  } else if (playback === "loading") {
    content = (
      <>
        <Icon name="progress_activity" size={16} color={soft} />
        <Txt variant="captionMedium" color={soft}>
          {t("Connecting…")}
        </Txt>
      </>
    );
  } else if (playback === "reconnecting") {
    content = (
      <>
        <Icon name="sync" size={16} color={colors.amber} />
        <Txt variant="captionMedium" color={colors.amber}>
          {t("Reconnecting")}
        </Txt>
      </>
    );
  } else if (playback === "error" || isUnavailable(station)) {
    content = (
      <>
        <Icon name="error" size={16} color={colors.alert} />
        <Txt variant="captionMedium" color={colors.alert} numberOfLines={1}>
          {playback === "error" ? t("Couldn't play") : t("Offline right now")}
        </Txt>
      </>
    );
  } else {
    content = (
      <>
        <LiveDot />
        <Txt variant="caption" color={soft} numberOfLines={1} style={{ flexShrink: 1 }}>
          {detail ? `${liveLabel} · ${detail}` : liveLabel}
        </Txt>
      </>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: playback === "idle" ? 6 : 4 }}>
      {content}
    </View>
  );
}
