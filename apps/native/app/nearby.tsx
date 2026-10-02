import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StationArt } from "@/components/station/station-art";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { findNearby } from "@/lib/nearby";
import { springs } from "@/theme/motion";
import { GUTTER, colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

/** The little station tiles that float around the "you are here" marker. */
const SATELLITES = [
  { id: "nearby-a", size: 40, left: 96, top: 62 },
  { id: "nearby-b", size: 46, left: 268, top: 96 },
  { id: "nearby-c", size: 34, left: 110, top: 226 },
  { id: "nearby-d", size: 40, left: 282, top: 236 },
  { id: "nearby-e", size: 30, left: 196, top: 20 },
];

/**
 * Explains what location is for before the system asks for it. Every path
 * leads somewhere useful: allow, pick a place by hand, or not now — and a
 * refusal is never an error.
 */
export default function Nearby() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const allow = async () => {
    setWorking(true);
    setNotice(null);
    const result = await findNearby();
    setWorking(false);

    if (!result.ok) {
      setNotice(
        result.reason === "denied"
          ? t("Location is off, and that’s fine. You can choose a place yourself.")
          : t("We couldn’t work out where you are. You can choose a place yourself."),
      );
      return;
    }

    router.replace({
      pathname: "/stations",
      params: {
        title: result.locality ?? result.country ?? t("Nearby"),
        code: result.countryCode,
      },
    });
  };

  return (
    <Screen>
      <View style={{ height: 60, justifyContent: "center", paddingHorizontal: 12 }}>
        <IconButton icon="close" accessibilityLabel={t("Close")} onPress={() => router.back()} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: GUTTER }}>
        <View style={{ height: 330, marginHorizontal: -GUTTER, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{ position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: "#DAF3FE" }}
          />
          {[330, 210].map((d, i) => (
            <MotiView
              key={d}
              from={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...springs.settle, delay: 80 + i * 90 }}
              style={{
                position: "absolute",
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "#87B6CD",
              }}
            />
          ))}

          {/* A slow pulse from the centre: "looking around you". */}
          {reduced ? null : (
            <MotiView
              from={{ scale: 0.5, opacity: 0.35 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ type: "timing", duration: 2600, loop: true, repeatReverse: false }}
              style={{
                position: "absolute",
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#50A9D9",
              }}
            />
          )}
          <View
            style={{
              position: "absolute",
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "rgba(80,169,217,0.18)",
            }}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="near_me" size={22} color={colors.onInk} filled />
          </View>

          <View style={{ position: "absolute", width: 412, height: 330 }} pointerEvents="none">
            {SATELLITES.map((s, i) => (
              <MotiView
                key={s.id}
                from={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springs.pop, delay: 260 + i * 80 }}
                style={{
                  position: "absolute",
                  left: s.left,
                  top: s.top,
                  borderRadius: s.size,
                  borderWidth: 4,
                  borderColor: colors.card,
                  boxShadow: "0 10px 20px -8px rgba(16,17,20,0.3)",
                }}
              >
                <StationArt station={{ stationuuid: s.id, name: "" }} size={s.size} radius={s.size / 2} />
              </MotiView>
            ))}
          </View>
        </View>

        <Rise index={1} style={{ marginTop: 10 }}>
          <Txt variant="titleLg" accessibilityRole="header">
            {t("Use your location to find nearby stations.")}
          </Txt>
        </Rise>
        <Rise index={2}>
          <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 12 }}>
            {t("Aircircle will use your approximate location to prioritize nearby radio. You can choose a country or city manually instead.")}
          </Txt>
        </Rise>

        {notice ? (
          <Rise
            style={{
              marginTop: 14,
              borderRadius: 18,
              backgroundColor: colors.signalSoft,
              padding: 14,
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Icon name="info" size={20} color={colors.signalDeep} />
            <Txt variant="meta" color={colors.signalDeep} accessibilityLiveRegion="polite" style={{ flex: 1 }}>
              {notice}
            </Txt>
          </Rise>
        ) : null}

        <View style={{ flex: 1 }} />

        <Rise index={3} style={{ gap: 8, marginBottom: insets.bottom + 8 }}>
          <Button
            label={working ? t("Finding stations…") : t("Allow Nearby stations")}
            icon="near_me"
            variant="signal"
            disabled={working}
            onPress={() => void allow()}
          />
          <Button
            label={t("Choose a place manually")}
            variant="card"
            height={52}
            onPress={() => router.replace("/browse")}
          />
          <Button label={t("Not now")} variant="ghost" height={44} onPress={() => router.back()} />
        </Rise>
      </View>
    </Screen>
  );
}
