import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ScrollView, View } from "react-native";

import { NowPlayingArt } from "@/components/player/now-playing-art";
import { StationArt } from "@/components/station/station-art";
import { StationTile } from "@/components/station/station-tile";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Icon } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { SectionHeader } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useNow } from "@/hooks/use-now";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatRemaining } from "@/lib/format";
import { FAILURE_COPY } from "@/lib/playback/copy";
import type { PlaybackError } from "@/lib/playback/errors";
import { stationPlace, stationSubtitle } from "@/lib/station";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import type { PlaybackStatus } from "@/stores/player";
import { useRecents } from "@/stores/recents";
import { useReport } from "@/stores/report";
import { useSleepTimer } from "@/stores/sleep-timer";
import { timing } from "@/theme/motion";
import { GUTTER, colors, fonts } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

/* ------------------------------------------------------------------------ *
 * Connecting
 * ------------------------------------------------------------------------ */

const STEPS = [msg("Connecting"), msg("Buffering"), msg("Playing")] as const;

/**
 * The first few seconds after Play: the station stays in view and three steps
 * show how far along the stream is, so the wait never looks like a hang.
 */
export function ConnectingView({ station, status }: { station: Station; status: PlaybackStatus }) {
  const reduced = useReducedMotion();
  const usingFallback = usePlayer((s) => s.usingFallback);
  const current = status === "buffering" ? 1 : 0;
  const subtitle = stationSubtitle(station);

  return (
    <View style={{ flex: 1, paddingHorizontal: GUTTER }}>
      <View style={{ flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center" }}>
        {/* Ripples leave the artwork while the stream is being opened. */}
        {reduced
          ? null
          : [0, 1, 2].map((i) => (
              <MotiView
                key={i}
                from={{ scale: 0.7, opacity: 0.5 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{
                  type: "timing",
                  duration: 2700,
                  delay: i * 900,
                  loop: true,
                  repeatReverse: false,
                }}
                style={{
                  position: "absolute",
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.7)",
                }}
              />
            ))}
        <MotiView
          from={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={timing.enter}
        >
          <StationArt station={station} size={200} radius={30} showName />
        </MotiView>
      </View>

      <Rise>
        <Txt
          variant="title"
          color={colors.onInk}
          accessibilityLiveRegion="polite"
          style={{ textAlign: "center" }}
        >
          {usingFallback
            ? t("Trying an alternate stream…")
            : status === "buffering"
              ? t("Waiting for the live stream…")
              : t("Connecting to {{name}}…", { name: station.name })}
        </Txt>
      </Rise>
      {subtitle ? (
        <Rise index={1} style={{ marginTop: 8, flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Flag code={station.countryCode} />
          <Txt variant="body" color={colors.onInk} numberOfLines={1} style={{ opacity: 0.75, lineHeight: 18 }}>
            {subtitle}
          </Txt>
        </Rise>
      ) : null}

      <Rise
        index={2}
        style={{ marginTop: 30, flexDirection: "row", justifyContent: "center", alignItems: "flex-start" }}
      >
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <View key={step} style={{ flexDirection: "row", alignItems: "flex-start" }}>
              {i > 0 ? (
                <View
                  style={{
                    width: 30,
                    height: 1.5,
                    marginTop: 18,
                    backgroundColor: "rgba(255,255,255,0.35)",
                  }}
                />
              ) : null}
              <View style={{ width: 84, alignItems: "center", gap: 8 }}>
                <MotiView
                  animate={{
                    backgroundColor: active || done ? "#FFFFFF" : "rgba(255,255,255,0)",
                    scale: active ? 1 : 0.94,
                  }}
                  transition={timing.base}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: active || done ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {done ? (
                    <Icon name="check" size={20} />
                  ) : active ? (
                    <MotiView
                      from={{ rotate: "0deg" }}
                      animate={{ rotate: reduced ? "0deg" : "360deg" }}
                      transition={{ type: "timing", duration: 900, loop: !reduced, repeatReverse: false }}
                    >
                      <Icon name="progress_activity" size={20} />
                    </MotiView>
                  ) : null}
                </MotiView>
                <Txt variant="captionMedium" color={colors.onInk} style={{ opacity: active || done ? 1 : 0.6 }}>
                  {t(step)}
                </Txt>
              </View>
            </View>
          );
        })}
      </Rise>

      <View style={{ flex: 0.6 }} />

      <Rise index={3} style={{ alignSelf: "center", marginBottom: 16 }}>
        <Button
          label={t("Cancel")}
          variant="nightOutline"
          height={52}
          onPress={() => usePlayer.getState().stop()}
          accessibilityLabel={t("Cancel connecting to {{name}}", { name: station.name })}
        />
      </Rise>
    </View>
  );
}

/* ------------------------------------------------------------------------ *
 * Reconnecting
 * ------------------------------------------------------------------------ */

/**
 * The stream dropped and is being retried. The whole screen goes amber so the
 * state can't be missed, the station stays visible, and both ways out — retry
 * now, or stop — are one tap.
 */
export function ReconnectingView({ station }: { station: Station }) {
  const timerEndsAt = useSleepTimer((s) => s.endsAt);
  const now = useNow(timerEndsAt ? 15_000 : null);
  const place = stationPlace(station);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }}
    >
      <View style={{ marginTop: 28, alignSelf: "center" }}>
        <NowPlayingArt
          station={station}
          size={216}
          dimmed
          rings={{ color: "rgba(177,111,35,0.45)", dashed: true }}
          badge={{ icon: "sync", color: colors.amber, ringColor: colors.amberCanvas, spinning: true }}
        />
      </View>

      <Rise
        style={{
          marginTop: 48,
          alignSelf: "flex-start",
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.amberSoft,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingLeft: 9,
          paddingRight: 12,
        }}
      >
        <Icon name="sync" size={16} color={colors.amber} />
        <Txt variant="eyebrow" color={colors.amber} style={{ letterSpacing: 0.72 }}>
          {t("Reconnecting")}
        </Txt>
      </Rise>

      <Rise index={1} style={{ marginTop: 16 }}>
        <Txt variant="display" accessibilityRole="header" accessibilityLiveRegion="polite">
          {t("Connection lost.")}
          {"\n"}
          <Txt variant="display" style={{ fontFamily: fonts.serifItalic }}>
            {t("Retrying…")}
          </Txt>
        </Txt>
      </Rise>

      <Rise index={2} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Flag code={station.countryCode} />
        <Txt variant="body" color={colors.inkSoft} numberOfLines={1} style={{ flexShrink: 1, lineHeight: 18 }}>
          {[station.name, place].filter(Boolean).join(" · ")}
        </Txt>
      </Rise>

      <Rise index={3} style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
        <Button
          label={t("Retry now")}
          icon="refresh"
          variant="amber"
          grow
          onPress={() => void usePlayer.getState().retry()}
        />
        <Button
          label={t("Stop")}
          icon="stop"
          iconFilled
          variant="amberOutline"
          onPress={() => usePlayer.getState().stop()}
        />
      </Rise>

      <Rise
        index={4}
        style={{
          marginTop: 18,
          borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.65)",
          paddingVertical: 14,
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="info" size={20} color={colors.inkSoft} />
          <Txt variant="meta" style={{ flex: 1 }}>
            {t("Audio resumes on its own when the stream returns.")}
          </Txt>
        </View>
        {timerEndsAt ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="bedtime" size={20} color={colors.amber} />
            <Txt variant="meta" style={{ flex: 1 }}>
              {t("Sleep timer still set · stops in {{time}}", {
                time: formatRemaining(timerEndsAt - now),
              })}
            </Txt>
          </View>
        ) : null}
      </Rise>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------------ *
 * Failed
 * ------------------------------------------------------------------------ */

/**
 * Retries are spent, or the failure is one retrying can't fix. Says which kind
 * of failure it is, keeps the station visible, and never leaves a dead end:
 * retry, report, or pick another station right here.
 */
export function FailureView({ station, error }: { station: Station; error: PlaybackError }) {
  const router = useRouter();
  const favorites = useFavorites((s) => s.stations);
  const recents = useRecents((s) => s.stations);
  const isRecording = usePlayer((s) => s.recording !== null);

  const copy = FAILURE_COPY[error.kind];
  const place = stationPlace(station);
  // A restriction or login wall won't change by trying again.
  const canRetry = error.kind !== "region_restricted" && error.kind !== "auth_required";

  const seen = new Set([station.stationuuid]);
  const alternatives = [...favorites, ...recents]
    .filter((s) => {
      if (seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    })
    .slice(0, 8);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={{ height: 210, marginTop: 10, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: "rgba(255,255,255,0.5)",
            }}
          />
          <NowPlayingArt
            station={station}
            size={150}
            dimmed
            rings={{ color: "rgba(255,255,255,0.9)" }}
            badge={{
              icon: error.kind === "region_restricted" || error.kind === "auth_required" ? "lock" : "error",
              color: colors.live,
              ringColor: colors.alertCanvas,
            }}
          />
        </View>

        <Rise style={{ marginTop: 22 }}>
          <Txt variant="eyebrow" color={colors.alert}>
            {t(copy.label)}
          </Txt>
        </Rise>
        <Rise index={1} style={{ marginTop: 12 }}>
          <Txt variant="displaySm" accessibilityRole="header" accessibilityLiveRegion="polite">
            {error.message}
          </Txt>
        </Rise>
        <Rise index={2} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Flag code={station.countryCode} />
          <Txt variant="body" color={colors.inkSoft} numberOfLines={1} style={{ flexShrink: 1, lineHeight: 18 }}>
            {[station.name, place].filter(Boolean).join(" · ")}
          </Txt>
        </Rise>
        <Rise index={3}>
          <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 6, lineHeight: 20 }}>
            {t(copy.detail)}
          </Txt>
        </Rise>

        <Rise index={4} style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          {canRetry ? (
            <Button
              label={t("Retry")}
              icon="refresh"
              variant="alert"
              height={52}
              grow
              onPress={() => void usePlayer.getState().retry()}
            />
          ) : (
            <Button
              label={t("Browse alternatives")}
              variant="signal"
              height={52}
              grow
              onPress={() => router.replace("/browse")}
            />
          )}
          {isRecording ? null : (
            <Button
              label={t("Report")}
              icon="flag"
              variant="alertOutline"
              height={52}
              onPress={() => useReport.getState().open(station, "no-play")}
            />
          )}
        </Rise>
      </View>

      {alternatives.length > 0 ? (
        <>
          <Rise index={5} style={{ marginTop: 26, paddingHorizontal: GUTTER }}>
            <SectionHeader
              title={t("Choose another station")}
              actionLabel={t("Browse")}
              onAction={() => router.replace("/browse")}
            />
          </Rise>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 14 }}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}
          >
            {alternatives.map((s, i) => (
              <StationTile key={s.stationuuid} station={s} size={104} index={i + 6} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </ScrollView>
  );
}
