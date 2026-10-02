import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { useState } from "react";
import { Linking, Platform, RefreshControl, ScrollView, View } from "react-native";

import { StationArt } from "@/components/station/station-art";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo-mark";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { stationLocality } from "@/lib/station";
import type { Station } from "@/lib/types";
import { useFavorites } from "@/stores/favorites";
import { useNetwork } from "@/stores/network";
import { useRecents } from "@/stores/recents";
import { GUTTER, colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

/** One of the dashed rings around the offline symbol, breathing slowly. */
function Ring({ size, opacity, delay }: { size: number; opacity: number; delay: number }) {
  const reduced = useReducedMotion();
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: reduced ? 1 : 1.03 }}
      transition={{
        opacity: { type: "timing", duration: 500, delay },
        scale: { type: "timing", duration: 2600, delay, loop: !reduced, repeatReverse: true },
      }}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: `rgba(255,255,255,${opacity})`,
      }}
    />
  );
}

function SavedRow({ station, kind, last }: { station: Station; kind: string; last: boolean }) {
  const locality = stationLocality(station);
  return (
    <View
      accessible
      accessibilityLabel={t("{{name}}, {{kind}}. Unavailable while offline.", { name: station.name, kind })}
      style={{
        minHeight: 76,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
      }}
    >
      <StationArt station={station} size={52} radius={15} unavailable />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Txt variant="bodyLg" color={colors.onInk} numberOfLines={1}>
          {station.name}
        </Txt>
        <Txt variant="meta" color={colors.nightFaint} numberOfLines={1}>
          {[kind, locality].filter(Boolean).join(" · ")}
        </Txt>
      </View>
      <Icon name="cloud_off" size={22} color="#5D6372" style={{ marginRight: 10 }} />
    </View>
  );
}

/**
 * Home with no connection. The whole screen changes so the state can't be
 * missed, saved stations stay listed so the listener can see what they have,
 * and Retry is the obvious next step.
 */
export function OfflineHome() {
  const favorites = useFavorites((s) => s.stations);
  const recents = useRecents((s) => s.stations);
  const [checking, setChecking] = useState(false);

  const retry = async () => {
    setChecking(true);
    await useNetwork.getState().check();
    setChecking(false);
  };

  const favoriteIds = new Set(favorites.map((s) => s.stationuuid));
  const saved = [
    ...favorites.slice(0, 3).map((station) => ({ station, kind: "Favorite" })),
    ...recents
      .filter((s) => !favoriteIds.has(s.stationuuid))
      .slice(0, 3)
      .map((station) => ({ station, kind: "Recent" })),
  ].slice(0, 5);

  return (
    <Screen atmosphere="offline">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={checking} onRefresh={retry} tintColor={colors.onInk} />
        }
      >
        <Rise style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LogoMark inverted />
          <Txt variant="bodyLg" color={colors.nightText} style={{ flex: 1 }}>
            Aircircle
          </Txt>
          <View
            style={{
              height: 30,
              borderRadius: 15,
              backgroundColor: "rgba(255,255,255,0.08)",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
            }}
          >
            <Icon name="wifi_off" size={16} color="#C9CCD4" />
            <Txt variant="captionMedium" color="#C9CCD4">
              {t("No connection")}
            </Txt>
          </View>
        </Rise>

        <View style={{ height: 260, marginTop: 6, alignItems: "center", justifyContent: "center" }}>
          <Ring size={360} opacity={0.12} delay={240} />
          <Ring size={260} opacity={0.18} delay={160} />
          <Ring size={160} opacity={0.26} delay={80} />
          <Rise offset={0}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="wifi_off" size={34} color={colors.onInk} />
            </View>
          </Rise>
        </View>

        <Rise index={1}>
          <Txt variant="display" color={colors.onInk} accessibilityRole="header">
            {t("You’re offline.")}
          </Txt>
        </Rise>
        <Rise index={2}>
          <Txt variant="body" color="#B8BCC8" style={{ marginTop: 10, fontSize: 16 }}>
            {t("Favorites and Recents are still available.")}
          </Txt>
        </Rise>

        <Rise index={3} style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
          <Button
            label={checking ? t("Checking…") : t("Retry")}
            icon="refresh"
            variant="night"
            height={52}
            onPress={retry}
            disabled={checking}
          />
          <Button
            label={t("Network settings")}
            variant="nightOutline"
            height={52}
            onPress={() => {
              if (Platform.OS === "android") {
                void Linking.sendIntent("android.settings.WIRELESS_SETTINGS").catch(() =>
                  Linking.openSettings(),
                );
              } else {
                void Linking.openSettings();
              }
            }}
          />
        </Rise>

        {saved.length > 0 ? (
          <>
            <Rise
              index={4}
              style={{
                marginTop: 30,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Txt variant="eyebrow" color={colors.nightFaint}>
                {t("On this device")}
              </Txt>
              <Txt variant="caption" color={colors.nightFaint}>
                {t("Streams need a connection")}
              </Txt>
            </Rise>
            <Rise index={5} style={{ marginTop: 6 }}>
              {saved.map(({ station, kind }, i) => (
                <SavedRow
                  key={station.stationuuid}
                  station={station}
                  kind={kind}
                  last={i === saved.length - 1}
                />
              ))}
            </Rise>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
