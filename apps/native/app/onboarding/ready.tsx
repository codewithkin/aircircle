import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingHeader } from "@/components/onboarding/parts";
import { StationArt } from "@/components/station/station-art";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { finishOnboarding } from "@/lib/onboarding";
import { useOnboarding } from "@/stores/onboarding";
import type { ListeningIntent } from "@/stores/onboarding";
import { springs } from "@/theme/motion";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

const CARD = {
  borderRadius: 22,
  backgroundColor: colors.card,
  boxShadow: shadows.card,
} as const;

/** What each answer changes about Home, in the listener's own terms. */
const LINES: Record<ListeningIntent, { icon: IconName; text: string }> = {
  "known-station": {
    icon: "search",
    text: msg("We’ll keep Search prominent so you can get to a known station quickly."),
  },
  local: {
    icon: "home_pin",
    text: msg("We’ll put hometown stations first and keep a place-based browse shortcut nearby."),
  },
  discover: {
    icon: "public",
    text: msg("We’ll keep Browse close so another country or genre is always a tap away."),
  },
  background: {
    icon: "work",
    text: msg("We’ll put your Recents up front so a steady station is quick to get back to."),
  },
  sleep: {
    icon: "bedtime",
    text: msg("We’ll put calm stations and the Sleep Timer within reach."),
  },
  simple: {
    icon: "tune",
    text: msg("We’ll keep Home to the essentials: search, your stations, and play."),
  },
};

/**
 * The payoff for answering: what Home will do with those answers. An honest
 * description of a local arrangement — no claims of anything smarter.
 */
export default function Ready() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const intents = useOnboarding((s) => s.intents);
  const places = useOnboarding((s) => s.places);
  const genres = useOnboarding((s) => s.genres);

  const lines = intents.slice(0, 3).map((intent) => LINES[intent]);
  if (lines.length === 0) {
    lines.push({
      icon: "search",
      text: t("We’ll start you with Search and stations that are popular right now."),
    });
    if (genres.length > 0 || places.length > 0) {
      lines.push({
        icon: "place",
        text: t("Your places and genres will be one tap away at the top of Home."),
      });
    }
  }

  const label = [places[0], genres[0]].filter(Boolean).join(" · ") || t("Popular now");
  const wantsNearby = intents.includes("local") && places.length === 0;

  // The three cards lean in from slightly different angles, like a hand of cards.
  const lean = (deg: number, delay: number) => ({
    from: { opacity: 0, translateY: reduced ? 0 : 30, rotate: "0deg" },
    animate: { opacity: 1, translateY: 0, rotate: reduced ? "0deg" : `${deg}deg` },
    transition: { ...springs.settle, delay },
  });

  return (
    <Screen atmosphere="calm" padTop={false}>
      <OnboardingHeader onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 10 }}
      >
        <View style={{ height: 300, marginTop: 8, marginHorizontal: -GUTTER, alignItems: "center" }}>
          <View
            style={{
              position: "absolute",
              top: -30,
              width: 360,
              height: 360,
              borderRadius: 180,
              backgroundColor: "rgba(255,255,255,0.45)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 25,
              width: 250,
              height: 250,
              borderRadius: 125,
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.9)",
            }}
          />

          <MotiView {...lean(-4, 100)} style={{ position: "absolute", top: 28, width: 296 }}>
            <View style={[CARD, { paddingVertical: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <Icon name={intents.includes("sleep") ? "bedtime" : "favorite"} size={20} />
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {intents.includes("sleep") ? t("Wind down") : t("Your Favorites")}
              </Txt>
              <Txt variant="captionMedium" color={colors.amber}>
                {intents.includes("sleep") ? t("Sleep timer") : t("One tap")}
              </Txt>
            </View>
          </MotiView>

          <MotiView {...lean(2, 220)} style={{ position: "absolute", top: 96, width: 320 }}>
            <View style={[CARD, { paddingVertical: 16, paddingHorizontal: 18, gap: 12 }]}>
              <Eyebrow>{label}</Eyebrow>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["ready-a", "ready-b", "ready-c", "ready-d"].map((id) => (
                  <StationArt key={id} station={{ stationuuid: id, name: "" }} size={48} radius={14} />
                ))}
              </View>
            </View>
          </MotiView>

          <MotiView {...lean(0, 340)} style={{ position: "absolute", top: 196, width: 340 }}>
            <View
              style={[
                CARD,
                {
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 1px 2px rgba(16,17,20,0.06), 0 24px 40px -20px rgba(16,17,20,0.3)",
                },
              ]}
            >
              <Icon name="search" size={22} color={colors.inkSoft} />
              <Txt variant="body" color={colors.inkFaint} style={{ fontSize: 16, lineHeight: 20 }}>
                {t("Station, city or genre")}
              </Txt>
            </View>
          </MotiView>
        </View>

        <Rise index={4} style={{ marginTop: 14 }}>
          <Txt variant="titleLg" accessibilityRole="header">
            {t("Your Home is ready to")}
          </Txt>
          <Txt style={{ fontFamily: fonts.serifItalic, fontSize: 40, lineHeight: 42, letterSpacing: -0.4, color: colors.ink }}>
            {t("sound like you.")}
          </Txt>
        </Rise>

        <View style={{ marginTop: 20, gap: 14 }}>
          {lines.map((line, i) => (
            <Rise key={line.text} index={5 + i} style={{ flexDirection: "row", gap: 14 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={line.icon} size={20} />
              </View>
              <Txt variant="body" style={{ flex: 1, paddingTop: 7 }}>
                {t(line.text)}
              </Txt>
            </Rise>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />

        <Rise index={8}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Icon name="smartphone" size={16} color={colors.inkSoft} />
            <Txt variant="caption" color={colors.inkSoft}>
              {t("Arranged on this device from your answers")}
            </Txt>
          </View>
          {/* Local radio with no place chosen: offer Nearby next, after explaining it. */}
          <Button
            label={t("Show my Home")}
            onPress={() => finishOnboarding(router, wantsNearby ? "nearby" : undefined)}
          />
        </Rise>
      </ScrollView>
    </Screen>
  );
}
