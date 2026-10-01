import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { getTopStations } from "@/lib/api/radio-browser";
import { canRecord } from "@/lib/recording/eligibility";
import { RECORDING_FAILURE_MESSAGES } from "@/lib/recording/types";
import { shareStation } from "@/lib/share";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { useNowPlaying } from "@/stores/now-playing";
import { usePlayer } from "@/stores/player";
import { totalRecordingBytes, useRecordings } from "@/stores/recordings";
import { useSleepTimer } from "@/stores/sleep-timer";

/**
 * Temporary harness for exercising the player until the real screens are
 * designed. Not styled, not final — replace with Home. Long-press a station
 * to favorite it, long-press a recording to delete it.
 */
export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { station, recording, position, status, pauseReason, error, retryAttempt } = usePlayer();
  const { play, playRecording, seekTo, toggle, stop, dismiss, retry } = usePlayer();
  const recordings = useRecordings();
  const nowPlaying = useNowPlaying((s) => s.title);
  const timer = useSleepTimer();
  const favorites = useFavorites();

  useEffect(() => {
    getTopStations(15)
      .then(setStations)
      .catch((e) => setLoadError(String(e)));
  }, []);

  return (
    <Container className="p-6">
      <View className="gap-2 pt-12">
        <Text className="text-foreground text-xl font-semibold">{station?.name ?? "No station"}</Text>
        <Text className="text-foreground">
          {recording ? "RECORDED" : "LIVE"} · {status}
          {recording ? ` · ${position}s` : ""}
          {pauseReason ? ` (${pauseReason})` : ""}
          {retryAttempt ? ` — attempt ${retryAttempt}` : ""}
        </Text>
        {!recording && status === "playing" ? (
          <Text className="text-muted">{nowPlaying ?? "Now playing information unavailable."}</Text>
        ) : null}
        {error ? (
          <Text className="text-danger">
            {error.message}
            {error.detail ? `\n${error.detail}` : ""}
          </Text>
        ) : null}

        <View className="flex-row gap-4 py-4">
          <Action label="Play / Pause" onPress={toggle} />
          <Action label="Stop" onPress={stop} />
          <Action label="Retry" onPress={retry} />
          <Action label="Dismiss" onPress={dismiss} />
          {station ? <Action label="Share" onPress={() => shareStation(station)} /> : null}
        </View>

        <Text className="text-foreground">
          {timer.endsAt
            ? `Timer ends ${new Date(timer.endsAt).toLocaleTimeString()}`
            : timer.didExpire
              ? "Sleep timer finished."
              : "No timer"}
        </Text>
        <View className="flex-row gap-4 pb-4">
          <Action label="Timer 1 min" onPress={() => timer.start(1)} />
          <Action label="Timer 15 min" onPress={() => timer.start(15)} />
          <Action label="Cancel timer" onPress={timer.cancel} />
        </View>
      </View>

      <View className="gap-2 pb-4">
        <Text className="text-foreground">
          {recordings.active
            ? `Recording ${recordings.active.station.name}`
            : recordings.lastSaved
              ? "Saved for offline listening."
              : recordings.failure
                ? RECORDING_FAILURE_MESSAGES[recordings.failure]
                : "Not recording"}
        </Text>
        <View className="flex-row gap-4">
          {station && !recording && canRecord(station) ? (
            <Action
              label={recordings.active ? "Stop recording" : "Record"}
              onPress={() => (recordings.active ? recordings.stop() : recordings.start(station))}
            />
          ) : null}
          {recording ? <Action label="+30s" onPress={() => seekTo(position + 30)} /> : null}
        </View>

        <Text className="text-muted">
          {recordings.recordings.length} saved ·{" "}
          {(totalRecordingBytes(recordings.recordings) / 1_000_000).toFixed(1)} MB
        </Text>
        {recordings.recordings.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`Play recording of ${r.stationName}`}
            onPress={() => playRecording(r)}
            onLongPress={() => recordings.remove(r.id)}
            className="py-2"
          >
            <Text className="text-foreground">
              {r.stationName} · {Math.round(r.durationMs / 1000)}s
            </Text>
          </Pressable>
        ))}
      </View>

      {loadError ? <Text className="text-danger">{loadError}</Text> : null}

      {stations.map((s) => (
        <Pressable
          key={s.stationuuid}
          accessibilityRole="button"
          accessibilityLabel={`Play ${s.name}`}
          onPress={() => play(s)}
          onLongPress={() => favorites.toggle(s)}
          className="py-3 border-b border-border"
        >
          <Text className="text-foreground">
            {favorites.stations.some((f) => f.stationuuid === s.stationuuid) ? "♥ " : ""}
            {s.name}
          </Text>
          <Text className="text-muted">{[s.country, s.codec].filter(Boolean).join(" · ")}</Text>
        </Pressable>
      ))}
    </Container>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="py-3">
      <Text className="text-accent font-semibold">{label}</Text>
    </Pressable>
  );
}
