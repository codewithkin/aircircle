import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { useRef } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NowPlayingArt } from "@/components/player/now-playing-art";
import { HEART_COLOR } from "@/components/station/heart-button";
import { StationRow } from "@/components/station/station-row";
import { Button, IconButton } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow, SectionHeader } from "@/components/ui/section-header";
import { RowListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { useStationPlayback } from "@/hooks/use-station-playback";
import { getStationByUuid, searchStations } from "@/lib/api/radio-browser";
import { haptics } from "@/lib/haptics";
import { FAILURE_COPY } from "@/lib/playback/copy";
import type { PlaybackError } from "@/lib/playback/errors";
import { canRecord } from "@/lib/recording/eligibility";
import { shareStation } from "@/lib/share";
import { isUnavailable, recallStation, stationGenres, stationLocality, stationPlace } from "@/lib/station";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { useNowPlaying } from "@/stores/now-playing";
import { usePlayer } from "@/stores/player";
import { useQuickActions } from "@/stores/quick-actions";
import { useRecordings } from "@/stores/recordings";
import { useReport } from "@/stores/report";
import { springs, timing } from "@/theme/motion";
import { stationArt } from "@/theme/station-art";
import { GUTTER, colors, fonts } from "@/theme/tokens";

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** One of the square actions under Play: a tinted tile and a label. */
function ActionTile({
  icon,
  label,
  onPress,
  background,
  color,
  filled,
  badge,
  disabled,
  index,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  background: string;
  color: string;
  filled?: boolean;
  badge?: string;
  disabled?: boolean;
  index: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...timing.enter, delay: 260 + index * 45 }}
      style={{ flex: 1 }}
    >
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        pressedScale={0.92}
        haptic="confirm"
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ alignItems: "center", gap: 8 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 20,
            backgroundColor: background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={24} color={color} filled={filled} />
          {badge ? (
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -12,
                height: 18,
                borderRadius: 9,
                paddingHorizontal: 6,
                backgroundColor: color,
                justifyContent: "center",
              }}
            >
              <Txt
                variant="tab"
                color={colors.onInk}
                style={{ fontFamily: fonts.sansSemibold, fontSize: 10, lineHeight: 12 }}
              >
                {badge}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt variant="tab" color={colors.inkSoft} numberOfLines={1}>
          {label}
        </Txt>
      </PressableScale>
    </MotiView>
  );
}

/**
 * The station could not be played. Play is replaced by a way forward, so the
 * screen is never a dead end, and stations that do play are listed below.
 */
function UnavailableStation({ station, error }: { station: Station; error: PlaybackError }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = FAILURE_COPY[error.kind];
  const tag = station.tags?.split(",")[0]?.trim();
  const locked = error.kind === "region_restricted" || error.kind === "auth_required";

  const alternatives = useAsync(tag ? `alt:${tag}` : "alt:top", () =>
    searchStations(tag ? { tag, limit: 8 } : { limit: 8 }),
  );
  const others = (alternatives.data ?? []).filter((s) => s.stationuuid !== station.stationuuid).slice(0, 4);

  return (
    <Screen>
      <View style={{ height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
        <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <IconButton
          icon="ios_share"
          accessibilityLabel={`Share ${station.name}`}
          onPress={() => void shareStation(station)}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 24 }}
      >
        <View style={{ height: 250, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{ position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: "#ECEDF0" }}
          />
          <NowPlayingArt
            station={station}
            size={150}
            dimmed
            rings={{ color: "#C9CCD4", dashed: true }}
            badge={{ icon: locked ? "lock" : "error", color: "#D02B31", ringColor: colors.canvas }}
          />
        </View>

        <Rise style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Flag code={station.countryCode} />
          <Txt variant="eyebrow" color={colors.inkSoft} numberOfLines={1} style={{ flexShrink: 1 }}>
            {[station.name, stationLocality(station)].filter(Boolean).join(" · ")}
          </Txt>
        </Rise>
        <Rise index={1} style={{ marginTop: 12 }}>
          <Txt variant="displaySm" accessibilityRole="header" style={{ fontSize: 42, lineHeight: 43 }}>
            {error.message}
          </Txt>
        </Rise>
        <Rise index={2}>
          <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10 }}>
            {copy.detail}
          </Txt>
        </Rise>

        <Rise index={3} style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          {locked ? (
            <Button
              label="Browse alternatives"
              variant="signal"
              height={52}
              grow
              onPress={() => router.push("/browse")}
            />
          ) : (
            <Button
              label="Retry"
              icon="refresh"
              variant="signal"
              height={52}
              grow
              onPress={() => void usePlayer.getState().play(station)}
            />
          )}
          {station.homepage ? (
            <Button
              label="Website"
              icon="open_in_new"
              variant="outline"
              height={52}
              onPress={() => void Linking.openURL(station.homepage!).catch(() => {})}
            />
          ) : (
            <Button
              label="Report"
              icon="flag"
              variant="outline"
              height={52}
              onPress={() => useReport.getState().open(station)}
            />
          )}
        </Rise>

        <Rise index={4} style={{ marginTop: 26 }}>
          <SectionHeader title={tag ? `Live ${titleCase(tag)} you can play` : "Stations you can play"} />
        </Rise>
        <View style={{ marginTop: 4 }}>
          {alternatives.loading && !alternatives.data ? (
            <RowListSkeleton count={3} />
          ) : (
            others.map((s, i) => (
              <StationRow
                key={s.stationuuid}
                station={s}
                index={i + 5}
                trailing="play"
                divider={i < others.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

export default function StationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const moreRef = useRef<View>(null);

  // Usually handed over by the previous screen; fetched only on a cold link.
  const remembered = id ? recallStation(id) : undefined;
  const fetched = useAsync(remembered || !id ? null : `station:${id}`, () => getStationByUuid(id));
  const station = remembered ?? fetched.data ?? null;

  const playback = useStationPlayback(station);
  const error = usePlayer((s) => s.error);
  const isFavorite = useFavorites((s) =>
    station ? s.stations.some((f) => f.stationuuid === station.stationuuid) : false,
  );
  const activeRecording = useRecordings((s) => s.active);
  const nowPlaying = useNowPlaying((s) => s.title);

  if (!station) {
    return (
      <Screen>
        <View style={{ height: 60, justifyContent: "center", paddingHorizontal: 12 }}>
          <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
        <View style={{ paddingHorizontal: GUTTER, gap: 14 }}>
          {fetched.loading ? (
            <>
              <Skeleton width="100%" height={236} radius={32} />
              <Skeleton width="100%" height={60} radius={30} />
              <Skeleton width="60%" height={14} radius={7} />
            </>
          ) : (
            <>
              <Txt variant="displaySm">This station isn’t in the directory any more.</Txt>
              <Txt variant="body" color={colors.inkSoft}>
                It may have been removed or renamed. Search will find it if it’s still on air.
              </Txt>
              <Button
                label="Search stations"
                icon="search"
                height={52}
                onPress={() => router.navigate({ pathname: "/search", params: { focus: "1" } })}
                containerStyle={{ alignSelf: "flex-start", marginTop: 8 }}
              />
            </>
          )}
        </View>
      </Screen>
    );
  }

  if (playback === "error" && error) return <UnavailableStation station={station} error={error} />;

  const art = stationArt(station.stationuuid);
  const unavailable = isUnavailable(station);
  const playing = playback === "playing";
  const loading = playback === "loading";
  const recordable = canRecord(station) && !station.hls;
  const recordingThis = activeRecording?.station.stationuuid === station.stationuuid;

  const locality = stationLocality(station);
  const headline = [stationPlace(station), stationGenres(station, 1), station.language?.split(",")[0]]
    .filter(Boolean)
    .map((part) => titleCase(part!))
    .join(" · ");
  const stream = [station.codec, station.bitrate ? `${station.bitrate} kbps` : ""].filter(Boolean).join(" · ");
  const shortName = station.name.length > 18 ? "station" : station.name;

  const togglePlay = () => {
    const player = usePlayer.getState();
    if (playback === "idle") void player.play(station);
    else void player.toggle();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <StatusBar style="light" />

      <Gradient colors={[art.colors[0], art.colors[1]]} angle={160} style={{ paddingTop: insets.top }}>
        {/* A light wash keeps white text readable on the palest palettes. */}
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(16,17,20,0.14)" }} />

        <View
          style={{ height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}
        >
          <IconButton
            icon="arrow_back"
            color={colors.onInk}
            background="rgba(255,255,255,0.2)"
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <View style={{ flex: 1 }} />
          <IconButton
            icon="ios_share"
            color={colors.onInk}
            background="rgba(255,255,255,0.2)"
            accessibilityLabel={`Share ${station.name}`}
            onPress={() => void shareStation(station, playing ? nowPlaying : null)}
          />
          <View ref={moreRef} collapsable={false}>
            <IconButton
              icon="more_vert"
              color={colors.onInk}
              background="rgba(255,255,255,0.2)"
              accessibilityLabel="More actions"
              onPress={() =>
                moreRef.current?.measureInWindow((x, y, width, height) => {
                  haptics.tap();
                  useQuickActions.getState().open(station, { x, y, width, height });
                })
              }
            />
          </View>
        </View>

        <View style={{ height: 236, paddingHorizontal: GUTTER, paddingBottom: 28, justifyContent: "flex-end" }}>
          <MotiView
            from={{ scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...timing.slow, delay: 80 }}
            style={{ position: "absolute", right: -90, top: -150 }}
          >
            <View
              style={{
                width: 380,
                height: 380,
                borderRadius: 190,
                borderWidth: 60,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            />
          </MotiView>
          <MotiView
            from={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springs.settle, delay: 200 }}
            style={{
              position: "absolute",
              right: 40,
              top: -10,
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: "rgba(255,255,255,0.28)",
            }}
          />

          <Rise style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.onInk }} />
            <Txt variant="captionMedium" color={colors.onInk} numberOfLines={1} style={{ opacity: 0.9 }}>
              {unavailable ? "OFFLINE RIGHT NOW" : locality ? `LIVE NOW · ${locality.toUpperCase()}` : "LIVE NOW"}
            </Txt>
          </Rise>
          <Rise index={1} style={{ marginTop: 12 }}>
            <Txt
              color={colors.onInk}
              accessibilityRole="header"
              numberOfLines={2}
              style={{ fontFamily: fonts.sansMedium, fontSize: 36, lineHeight: 40, letterSpacing: -1.08 }}
            >
              {station.name}
            </Txt>
          </Rise>
          {headline ? (
            <Rise index={2} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Flag code={station.countryCode} />
              <Txt
                variant="body"
                color={colors.onInk}
                numberOfLines={1}
                style={{ flexShrink: 1, opacity: 0.85, lineHeight: 18 }}
              >
                {headline}
              </Txt>
            </Rise>
          ) : null}
        </View>
      </Gradient>

      {/* The white sheet rises over the header as the screen opens. */}
      <MotiView
        from={{ translateY: 40, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ ...springs.settle, delay: 120 }}
        style={{
          flex: 1,
          marginTop: -32,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          backgroundColor: colors.card,
          overflow: "hidden",
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: insets.bottom + 24 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Txt variant="caption" color={colors.inkSoft} numberOfLines={1} style={{ flexShrink: 1 }}>
              {stream ? `Online stream · ${stream}` : "Online stream"}
            </Txt>
            <View
              style={{
                height: 30,
                borderRadius: 15,
                backgroundColor: unavailable ? colors.alertSoft : colors.okSoft,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: unavailable ? colors.alertStrong : colors.ok,
                }}
              />
              <Txt variant="captionMedium" color={unavailable ? "#AC1922" : colors.okDeep}>
                {unavailable ? "Offline" : "Available"}
              </Txt>
            </View>
          </View>

          <Rise index={2} style={{ marginTop: 20 }}>
            <Button
              label={
                loading ? "Connecting…" : playing ? "Pause" : playback === "idle" ? `Play ${shortName}` : "Resume"
              }
              icon={loading ? "progress_activity" : playing ? "pause" : "play_arrow"}
              iconFilled
              height={60}
              // Locked while connecting, so a second tap can't start a second stream.
              disabled={loading}
              onPress={togglePlay}
              accessibilityLabel={playing ? `Pause ${station.name}` : `Play ${station.name}`}
            />
          </Rise>

          <View style={{ marginTop: 20, flexDirection: "row", gap: 4 }}>
            <ActionTile
              index={0}
              icon="favorite"
              filled={isFavorite}
              label={isFavorite ? "Saved" : "Favorite"}
              background="#FFE7F1"
              color={HEART_COLOR}
              onPress={() => useFavorites.getState().toggle(station)}
            />
            {recordable ? (
              <ActionTile
                index={1}
                icon={recordingThis ? "stop" : "radio_button_checked"}
                filled={recordingThis}
                label={recordingThis ? "Stop" : "Record"}
                background={colors.alertSoft}
                color="#644FB1"
                onPress={() => {
                  const store = useRecordings.getState();
                  if (recordingThis) return void store.stop();
                  // Recording is of what's on air, so make sure it is.
                  if (playback === "idle") void usePlayer.getState().play(station);
                  void store.start(station);
                }}
              />
            ) : null}
            <ActionTile
              index={2}
              icon="bedtime"
              label="Timer"
              background="#EEECFF"
              color={colors.amber}
              onPress={() => router.push("/sleep-timer")}
            />
            <ActionTile
              index={3}
              icon="flag"
              label="Report"
              background={colors.alertSoft}
              color={colors.signal}
              onPress={() => useReport.getState().open(station)}
            />
            {station.homepage ? (
              <ActionTile
                index={4}
                icon="open_in_new"
                label="Website"
                background={colors.signalSoft}
                color={colors.signal}
                onPress={() => void Linking.openURL(station.homepage!).catch(() => {})}
              />
            ) : null}
          </View>

          <Rise index={5} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="radio_button_checked" size={17} color={recordable ? "#AC1922" : colors.inkFaint} />
            <Txt variant="captionMedium" color={recordable ? "#AC1922" : colors.inkFaint} style={{ flex: 1 }}>
              {recordable
                ? "Offline recording available for this station."
                : "This station’s stream can’t be saved for offline listening."}
            </Txt>
          </Rise>

          <Rise
            index={6}
            style={{
              marginTop: 22,
              borderRadius: 20,
              backgroundColor: colors.canvas,
              paddingVertical: 16,
              paddingHorizontal: 18,
              gap: 6,
            }}
          >
            <Eyebrow>On air now</Eyebrow>
            <Txt variant="section" numberOfLines={2} style={{ marginTop: 2, lineHeight: 21 }}>
              {playing && nowPlaying ? nowPlaying : "Live radio"}
            </Txt>
            <Txt variant="meta" color={colors.inkSoft}>
              {playing
                ? nowPlaying
                  ? "From the station’s own stream"
                  : "Now playing information unavailable."
                : "What’s on air shows here once the station is playing."}
            </Txt>
          </Rise>

          <Rise index={7} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={16} color={colors.inkFaint} />
            <Txt variant="caption" color={colors.inkFaint}>
              Online stream · Internet connection required
            </Txt>
          </Rise>
        </ScrollView>
      </MotiView>
    </View>
  );
}
