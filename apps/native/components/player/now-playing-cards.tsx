import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { LiveDot } from "@/components/ui/live";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useNow } from "@/hooks/use-now";
import { formatBytes, formatClock, formatDay, formatDuration } from "@/lib/format";
import { capturedBytes, freeDiskBytes } from "@/lib/recording/recorder";
import type { Recording } from "@/lib/recording/types";
import { useNowPlaying } from "@/stores/now-playing";
import { useRecordings } from "@/stores/recordings";
import { timing } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";
import { t } from "@/lib/i18n";

const CARD = {
  borderRadius: 22,
  backgroundColor: colors.card,
  boxShadow: shadows.card,
  paddingVertical: 16,
  paddingHorizontal: 18,
} as const;

/**
 * What's on air, when the station says. The card keeps the same height whether
 * or not there is a title, so nothing jumps when metadata arrives or goes.
 */
export function OnAirCard() {
  const title = useNowPlaying((s) => s.title);
  const artist = useNowPlaying((s) => s.artist);
  const song = useNowPlaying((s) => s.song);

  return (
    <View style={[CARD, { minHeight: 92, justifyContent: "center" }]} accessibilityLiveRegion="polite">
      <Eyebrow>{t("On air")}</Eyebrow>
      {/* Keyed by title so a new song cross-fades in rather than snapping. */}
      <MotiView
        key={title ?? "none"}
        from={{ opacity: 0, translateY: 4 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={timing.enter}
        style={{ marginTop: 8, gap: 4 }}
      >
        {title ? (
          <>
            <Txt variant="heading" numberOfLines={1}>
              {song ?? title}
            </Txt>
            {artist ? (
              <Txt variant="meta" color={colors.inkSoft} numberOfLines={1}>
                {artist}
              </Txt>
            ) : null}
          </>
        ) : (
          <Txt variant="meta" color={colors.inkSoft}>
            {t("Now playing information unavailable.")}
          </Txt>
        )}
      </MotiView>
    </View>
  );
}

/** Replaces the on-air card while a recording is running. */
export function RecordingCard() {
  const active = useRecordings((s) => s.active);
  const now = useNow(active ? 1000 : null);
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const read = () =>
      freeDiskBytes()
        .then((bytes) => {
          if (!cancelled) setFree(bytes);
        })
        .catch(() => {});
    void read();
    const timer = setInterval(read, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);

  if (!active) return null;

  const elapsed = (now - active.startedAt) / 1000;
  const bytes = capturedBytes();

  return (
    <View style={[CARD, { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 14 }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LiveDot size={8} pulse />
          <Eyebrow color="#AC1922">{t("Recording")}</Eyebrow>
        </View>
        <Txt
          variant="titleSm"
          accessibilityLabel={t("Recording, {{count}} minutes {{count2}} seconds", { count: Math.floor(elapsed / 60), count2: Math.floor(elapsed % 60) })}
          style={{ fontSize: 20, lineHeight: 22, fontVariant: ["tabular-nums"] }}
        >
          {formatClock(elapsed)}
        </Txt>
        <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
          {bytes > 0 ? formatBytes(bytes) : t("Starting…")}
          {free !== null ? t(" · {{size}} free on this device", { size: formatBytes(free) }) : ""}
        </Txt>
      </View>

      <PressableScale
        onPress={() => void useRecordings.getState().stop()}
        haptic="confirm"
        accessibilityRole="button"
        accessibilityLabel={t("Stop recording")}
        style={{
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.alertSoft,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingLeft: 12,
          paddingRight: 16,
        }}
      >
        <Icon name="stop" size={18} color="#AC1922" filled />
        <Txt variant="label" color="#AC1922">
          {t("Stop")}
        </Txt>
      </PressableScale>
    </View>
  );
}

/** Shown instead of the on-air card when a saved recording is playing. */
export function RecordedCard({ recording, position }: { recording: Recording; position: number }) {
  return (
    <View style={[CARD, { minHeight: 92, justifyContent: "center", gap: 4 }]}>
      <Eyebrow>{t("Saved recording")}</Eyebrow>
      <Txt variant="heading" style={{ marginTop: 4, fontVariant: ["tabular-nums"] }}>
        {t("{{time}} of about {{duration}}", {
          time: formatClock(position),
          duration: formatDuration(recording.durationMs),
        })}
      </Txt>
      <Txt variant="meta" color={colors.inkSoft}>
        {t("Recorded {{day}} · {{size}} · Available offline", {
          day: formatDay(recording.recordedAt),
          size: formatBytes(recording.sizeBytes),
        })}
      </Txt>
    </View>
  );
}
