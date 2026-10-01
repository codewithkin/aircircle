import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingHeader, OptionRow } from "@/components/onboarding/parts";
import { Button } from "@/components/ui/button";
import type { IconName } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useOnboarding } from "@/stores/onboarding";
import type { ListeningIntent } from "@/stores/onboarding";
import { GUTTER, colors } from "@/theme/tokens";

const INTENTS: { value: ListeningIntent; icon: IconName; label: string }[] = [
  { value: "known-station", icon: "radio", label: "I already know a station." },
  { value: "local", icon: "home_pin", label: "I want local or hometown radio." },
  { value: "discover", icon: "public", label: "I want to discover stations around the world." },
  { value: "background", icon: "work", label: "I need background audio while I work or commute." },
  { value: "sleep", icon: "bedtime", label: "I listen while winding down or falling asleep." },
  { value: "simple", icon: "tune", label: "I want a simple radio experience without extra feeds." },
];

/** Step 1 of 2: what brings the listener to radio. Pick any number, or none. */
export default function Intent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const intents = useOnboarding((s) => s.intents);
  const toggleIntent = useOnboarding((s) => s.toggleIntent);

  const next = () => router.push("/onboarding/taste");

  return (
    <Screen padTop={false}>
      <OnboardingHeader onBack={() => router.back()} step={1} skipLabel="Skip for now" onSkip={next} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: insets.bottom + 10 }}
      >
        <Rise>
          <Eyebrow>Step 1 of 2</Eyebrow>
        </Rise>
        <Rise index={1}>
          <Txt variant="titleLg" accessibilityRole="header" style={{ marginTop: 12 }}>
            What brings you to radio?
          </Txt>
        </Rise>
        <Rise index={2}>
          <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 8 }}>
            Pick as many as you like. This shapes what you see first.
          </Txt>
        </Rise>

        <View style={{ marginTop: 20, gap: 8 }}>
          {INTENTS.map((intent, i) => (
            <Rise key={intent.value} index={3 + i} offset={10}>
              <OptionRow
                icon={intent.icon}
                label={intent.label}
                selected={intents.includes(intent.value)}
                onPress={() => toggleIntent(intent.value)}
              />
            </Rise>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />

        <Rise index={8}>
          <Button
            label={intents.length > 0 ? `Continue · ${intents.length} selected` : "Continue"}
            onPress={next}
          />
        </Rise>
      </ScrollView>
    </Screen>
  );
}
