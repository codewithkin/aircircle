import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayButton } from "@/components/station/play-button";
import { StationArt } from "@/components/station/station-art";
import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EqBars } from "@/components/ui/live";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { formatBytes, formatDay, formatDuration } from "@/lib/format";
import type { Recording } from "@/lib/recording/types";
import { usePlayer } from "@/stores/player";
import { totalRecordingBytes, useRecordings } from "@/stores/recordings";
import { useToast } from "@/stores/toast";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";

function RecordingRow({ recording, index }: { recording: Recording; index: number }) {
  const router = useRouter();
  const isCurrent = usePlayer((s) => s.recording?.id === recording.id);
  const status = usePlayer((s) => s.status);
  const playing = isCurrent && status === "playing";
  const loading = isCurrent && (status === "connecting" || status === "buffering");
  const broken = isCurrent && status === "error";

  const play = () => {
    const player = usePlayer.getState();
    if (isCurrent && status !== "error") void player.toggle();
    else void player.playRecording(recording);
  };

  return (
    <Rise index={index + 2} offset={10}>
      <PressableScale
        onPress={() => {
          play();
          if (!isCurrent) router.push("/now-playing");
        }}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={`Recording of ${recording.stationName}, ${formatDay(recording.recordedAt)}, ${formatDuration(recording.durationMs)}`}
        accessibilityHint="Plays the saved recording."
        style={{
          borderRadius: 22,
          backgroundColor: colors.card,
          boxShadow: shadows.card,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <StationArt
          station={{ stationuuid: recording.stationUuid, name: recording.stationName }}
          size={56}
          radius={16}
          unavailable={broken}
        />

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt variant="bodyLg" numberOfLines={1}>
            {recording.stationName}
          </Txt>
          <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
            {formatDay(recording.recordedAt)} · {formatDuration(recording.durationMs)} ·{" "}
            {formatBytes(recording.sizeBytes)}
          </Txt>
          {/* Always labelled Recorded — a saved file is never passed off as live. */}
          <View
            style={{
              alignSelf: "flex-start",
              height: 22,
              borderRadius: 11,
              backgroundColor: broken ? colors.alertSoft : colors.chip,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingLeft: 7,
              paddingRight: 9,
              marginTop: 2,
            }}
          >
            {playing ? (
              <EqBars size={12} />
            ) : (
              <Icon
                name={broken ? "error" : "download_done"}
                size={13}
                color={broken ? colors.alert : colors.ink}
              />
            )}
            <Txt
              variant="tab"
              color={broken ? colors.alert : colors.ink}
              style={{ fontFamily: fonts.sansSemibold, fontSize: 11 }}
            >
              {broken ? "Unavailable" : playing ? "Playing" : "Recorded"}
            </Txt>
          </View>
        </View>

        <PlayButton
          size={44}
          background={colors.signalSoft}
          color={colors.signal}
          state={loading ? "loading" : playing ? "pause" : "play"}
          onPress={play}
          accessibilityLabel={playing ? "Pause recording" : "Play recording"}
        />
        <IconButton
          icon="delete"
          size={40}
          iconSize={20}
          color={colors.inkSoft}
          accessibilityLabel={`Delete recording of ${recording.stationName}`}
          onPress={() => {
            useRecordings.getState().remove(recording.id);
            useToast.getState().show({ message: "Recording deleted", icon: "delete" });
          }}
        />
      </PressableScale>
    </Rise>
  );
}

/** Saved recordings. Works with no connection at all. */
export default function Recordings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recordings = useRecordings((s) => s.recordings);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Rise style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: -10 }}>
          <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} />
          <Txt variant="titleLg" accessibilityRole="header" style={{ fontSize: 28 }}>
            Recordings
          </Txt>
        </Rise>

        <Rise index={1} style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="smartphone" size={16} color={colors.inkSoft} />
          <Txt variant="meta" color={colors.inkSoft}>
            {recordings.length === 0
              ? "Available offline · Saved on this device"
              : `Available offline · ${formatBytes(totalRecordingBytes(recordings))} on this device`}
          </Txt>
        </Rise>

        <View style={{ marginTop: 20, gap: 10 }}>
          {recordings.length === 0 ? (
            <Rise index={2}>
              <Txt variant="titleSm">Nothing recorded yet.</Txt>
              <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 6 }}>
                Tap Record while a station is playing to save it for offline listening.
              </Txt>
            </Rise>
          ) : (
            recordings.map((r, i) => <RecordingRow key={r.id} recording={r} index={i} />)
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
