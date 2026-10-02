import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Txt } from "@/components/ui/txt";
import { formatBytes } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { clearLocalData } from "@/lib/local-data";
import { useFavorites } from "@/stores/favorites";
import { usePlayer } from "@/stores/player";
import { useRecentSearches } from "@/stores/recent-searches";
import { useRecents } from "@/stores/recents";
import { totalRecordingBytes, useRecordings } from "@/stores/recordings";
import { useToast } from "@/stores/toast";
import { GUTTER, colors, shadows } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

type Target = "favorites" | "recents" | "recordings" | "searches" | "last" | "everything";

const CONFIRM: Record<Target, { title: string; body: string; action: string }> = {
  favorites: {
    title: msg("Clear all Favorites?"),
    body: msg("Every saved station is removed from this phone. Your Recents are not affected."),
    action: msg("Clear Favorites"),
  },
  recents: {
    title: msg("Clear Recents?"),
    body: msg("The list of stations you’ve played is removed from this phone. Favorites are not affected."),
    action: msg("Clear Recents"),
  },
  recordings: {
    title: msg("Delete all recordings?"),
    body: msg("Every saved recording and its audio file is deleted from this phone."),
    action: msg("Delete recordings"),
  },
  searches: {
    title: msg("Clear recent searches?"),
    body: msg("Your search history is removed from this phone."),
    action: msg("Clear searches"),
  },
  last: {
    title: msg("Forget the last station?"),
    body: msg("Playback stops and Home will no longer offer to resume it."),
    action: msg("Forget station"),
  },
  everything: {
    title: msg("Clear everything on this phone?"),
    body: msg("This removes Favorites, Recents, the last station, any sleep timer, all recordings and recent searches. It can’t be undone. Stations in the directory are not affected."),
    action: msg("Clear everything"),
  },
};

function DataRow({
  icon,
  label,
  detail,
  onClear,
  disabled,
  last,
}: {
  icon: IconName;
  label: string;
  detail: string;
  onClear: () => void;
  disabled: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        minHeight: 68,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.hairline,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={22} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant="bodyLg">{label}</Txt>
        <Txt variant="caption" color={colors.inkSoft}>
          {detail}
        </Txt>
      </View>
      <Button
        label={t("Clear")}
        variant="outline"
        height={38}
        disabled={disabled}
        onPress={onClear}
        accessibilityLabel={t("Clear {{label}}", { label })}
      />
    </View>
  );
}

/**
 * Settings → Manage: what's stored on this phone, and how to remove it. Every
 * removal names exactly what goes and asks first.
 */
export default function LocalData() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const favorites = useFavorites((s) => s.stations.length);
  const recents = useRecents((s) => s.stations.length);
  const recordings = useRecordings((s) => s.recordings);
  const searches = useRecentSearches((s) => s.queries.length);
  const lastStation = usePlayer((s) => (s.recording ? null : s.station));

  const [target, setTarget] = useState<Target | null>(null);
  // Kept so the sheet still has its words while it slides away.
  const [shown, setShown] = useState<Target>("everything");

  const ask = (t: Target) => {
    setShown(t);
    setTarget(t);
  };

  const confirm = () => {
    switch (shown) {
      case "favorites":
        useFavorites.getState().clear();
        break;
      case "recents":
        useRecents.getState().clear();
        break;
      case "recordings":
        useRecordings.getState().clearAll();
        break;
      case "searches":
        useRecentSearches.getState().clear();
        break;
      case "last":
        usePlayer.getState().dismiss();
        break;
      case "everything":
        clearLocalData();
        break;
    }
    haptics.warning();
    setTarget(null);
    useToast.getState().show({ message: t("Removed from this phone"), icon: "check_circle" });
  };

  const copy = CONFIRM[shown];
  const nothing = favorites + recents + recordings.length + searches === 0 && !lastStation;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
      >
        <Rise style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: -10 }}>
          <IconButton icon="arrow_back" accessibilityLabel={t("Back")} onPress={() => router.back()} />
          <Txt variant="titleLg" accessibilityRole="header" style={{ fontSize: 28 }}>
            {t("Local data")}
          </Txt>
        </Rise>
        <Rise index={1}>
          <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 6, lineHeight: 20 }}>
            {t("Everything here lives only on this phone. There is no account and nothing is synced, so removing it here removes it for good.")}
          </Txt>
        </Rise>

        <Rise
          index={2}
          style={{
            marginTop: 20,
            borderRadius: 22,
            backgroundColor: colors.card,
            boxShadow: shadows.card,
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          <DataRow
            icon="favorite"
            label={t("Favorites")}
            detail={t("{{number}} saved", { number: favorites })}
            disabled={favorites === 0}
            onClear={() => ask("favorites")}
          />
          <DataRow
            icon="history"
            label={t("Recents")}
            detail={t("{{number}} played", { number: recents })}
            disabled={recents === 0}
            onClear={() => ask("recents")}
          />
          <DataRow
            icon="radio"
            label={t("Last station")}
            detail={lastStation ? lastStation.name : "None"}
            disabled={!lastStation}
            onClear={() => ask("last")}
          />
          <DataRow
            icon="download_done"
            label={t("Recordings")}
            detail={
              recordings.length === 0
                ? t("None")
                : t("{{count}} saved · {{size}}", { count: recordings.length, size: formatBytes(totalRecordingBytes(recordings)) })
            }
            disabled={recordings.length === 0}
            onClear={() => ask("recordings")}
          />
          <DataRow
            icon="search"
            label={t("Recent searches")}
            detail={t("{{number}} saved", { number: searches })}
            disabled={searches === 0}
            onClear={() => ask("searches")}
            last
          />
        </Rise>

        <Rise index={3} style={{ marginTop: 22 }}>
          <Button
            label={t("Clear everything")}
            icon="delete"
            variant="alertOutline"
            height={52}
            disabled={nothing}
            onPress={() => ask("everything")}
          />
          <Txt variant="caption" color={colors.inkFaint} style={{ marginTop: 12, lineHeight: 19 }}>
            {t("Your settings stay as they are. Stations in the directory are never deleted.")}
          </Txt>
        </Rise>
      </ScrollView>

      <Sheet visible={target !== null} onClose={() => setTarget(null)} accessibilityLabel={t(copy.title)}>
        <Txt variant="titleSm" accessibilityRole="header">
          {t(copy.title)}
        </Txt>
        <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10 }}>
          {t(copy.body)}
        </Txt>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 22, marginBottom: 8 }}>
          <Button label={t("Cancel")} variant="outline" height={52} onPress={() => setTarget(null)} />
          <Button label={t(copy.action)} variant="alert" height={52} grow onPress={confirm} />
        </View>
      </Sheet>
    </Screen>
  );
}
