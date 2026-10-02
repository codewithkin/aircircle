import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingHeader } from "@/components/onboarding/parts";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { finishOnboarding } from "@/lib/onboarding";
import { timing } from "@/theme/motion";
import { GUTTER, colors, fonts } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

const WAYS: { icon: IconName; title: string; detail: string }[] = [
  { icon: "radio", title: msg("Station"), detail: msg("Name or call sign") },
  { icon: "place", title: msg("Place"), detail: msg("Country or city") },
  { icon: "translate", title: msg("Language"), detail: msg("What it speaks") },
  { icon: "music_note", title: msg("Genre"), detail: msg("What it plays") },
];

/** The outcome, in one sentence, and the four ways to find a station. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <Screen atmosphere="night" padTop={false}>
      <StatusBar style="light" />
      <OnboardingHeader
        onDark
        skipLabel={t("Skip to Search")}
        onSkip={() => finishOnboarding(router, "search")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 10 }}
      >
        {/* Wide signal rings spreading from behind the headline. */}
        <View style={{ height: 120, marginHorizontal: -GUTTER, alignItems: "center" }}>
          {[560, 400].map((d, i) => (
            <MotiView
              key={d}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: reduced ? 1 : 1.04 }}
              transition={{
                opacity: { ...timing.slow, delay: i * 120 },
                scale: { type: "timing", duration: 3200, delay: i * 300, loop: !reduced, repeatReverse: true },
              }}
              style={{
                position: "absolute",
                top: 120 - d / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: 1,
                borderColor: i === 0 ? "rgba(160,200,255,0.12)" : "rgba(160,200,255,0.18)",
              }}
            />
          ))}
          <View
            style={{
              position: "absolute",
              top: 0,
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: "rgba(0,123,173,0.22)",
            }}
          />
        </View>

        <Rise index={1}>
          <Txt
            color={colors.onInk}
            accessibilityRole="header"
            style={{ fontFamily: fonts.serif, fontSize: 44, lineHeight: 45, letterSpacing: -0.44 }}
          >
            {t("Your next station is closer than you think.")}
          </Txt>
        </Rise>
        <Rise index={2}>
          <Txt variant="body" color="#B8BCC8" style={{ marginTop: 16, fontSize: 16, lineHeight: 23 }}>
            {t("Aircircle helps you find live internet radio by station, place, language, or genre. No account is needed to start.")}
          </Txt>
        </Rise>

        <View style={{ marginTop: 26, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {WAYS.map((way, i) => (
            <Rise key={way.title} index={3 + i} style={{ flexBasis: "47%", flexGrow: 1 }}>
              <View
                accessible
                accessibilityLabel={`${t(way.title)}: ${t(way.detail)}`}
                style={{
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  padding: 16,
                  gap: 18,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={way.icon} size={22} color={colors.onInk} />
                </View>
                <View style={{ gap: 4 }}>
                  <Txt variant="bodyLg" color={colors.onInk}>
                    {t(way.title)}
                  </Txt>
                  <Txt variant="caption" color={colors.nightText}>
                    {t(way.detail)}
                  </Txt>
                </View>
              </View>
            </Rise>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />

        <Rise index={7} style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Icon name="info" size={16} color={colors.nightText} />
          <Txt variant="caption" color={colors.nightText} style={{ flex: 1, lineHeight: 18 }}>
            {t("Internet connection required. Stations come from third-party broadcasters and may be unavailable.")}
          </Txt>
        </Rise>
        <Rise index={8}>
          <Button label={t("Continue")} variant="white" onPress={() => router.push("/onboarding/intent")} />
        </Rise>
      </ScrollView>
    </Screen>
  );
}
