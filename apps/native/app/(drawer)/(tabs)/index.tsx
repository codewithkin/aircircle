import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { getTopStations } from "@/lib/api/radio-browser";
import type { Station } from "@/lib/types";
import { usePlayer } from "@/stores/player";

/**
 * Temporary harness for exercising the player until the real screens are
 * designed. Not styled, not final — replace with Home.
 */
export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { station, status, pauseReason, error, retryAttempt } = usePlayer();
  const { play, toggle, stop, dismiss, retry } = usePlayer();

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
          {status}
          {pauseReason ? ` (${pauseReason})` : ""}
          {retryAttempt ? ` — attempt ${retryAttempt}` : ""}
        </Text>
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
        </View>
      </View>

      {loadError ? <Text className="text-danger">{loadError}</Text> : null}

      {stations.map((s) => (
        <Pressable
          key={s.stationuuid}
          accessibilityRole="button"
          accessibilityLabel={`Play ${s.name}`}
          onPress={() => play(s)}
          className="py-3 border-b border-border"
        >
          <Text className="text-foreground">{s.name}</Text>
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
