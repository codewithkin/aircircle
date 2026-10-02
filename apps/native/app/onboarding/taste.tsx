import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GENRES } from "@/components/browse/genre-grid";
import { OnboardingHeader, PlaceCard } from "@/components/onboarding/parts";
import { PickerSheet } from "@/components/search/picker-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Flag } from "@/components/ui/flag";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow } from "@/components/ui/section-header";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { getCountries } from "@/lib/api/radio-browser";
import { deviceCountryCode, finishOnboarding } from "@/lib/onboarding";
import { useOnboarding } from "@/stores/onboarding";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

/** The order the genres are offered in. */
const GENRE_ORDER = [
  msg("News"),
  msg("Music"),
  msg("Talk"),
  msg("Sports"),
  msg("Classical"),
  msg("Jazz"),
  msg("Culture"),
  msg("Community"),
  msg("Religious"),
  msg("Student/College"),
].filter((name) => GENRES.some((g) => g.name === name));

/** Step 2 of 2: genres and places to keep within reach. Everything optional. */
export default function Taste() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const genres = useOnboarding((s) => s.genres);
  const places = useOnboarding((s) => s.places);
  const { toggleGenre, togglePlace } = useOnboarding.getState();

  const [picker, setPicker] = useState(false);

  // The device's region gives a sensible first place without asking for location.
  const countries = useAsync("onboarding:countries", () => getCountries());
  const deviceCode = deviceCountryCode();
  const home = countries.data?.find((c) => c.code === deviceCode) ?? null;
  const codeFor = (name: string) => countries.data?.find((c) => c.name === name)?.code;

  const added = places.filter((p) => p !== home?.name);

  return (
    <Screen padTop={false}>
      <OnboardingHeader
        onBack={() => router.back()}
        step={2}
        skipLabel={t("Skip for now")}
        onSkip={() => router.push("/onboarding/ready")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: insets.bottom + 10 }}
      >
        <Rise>
          <Eyebrow>{t("Step 2 of 2")}</Eyebrow>
        </Rise>
        <Rise index={1}>
          <Txt variant="titleLg" accessibilityRole="header" style={{ marginTop: 12 }}>
            {t("What should we put within reach?")}
          </Txt>
        </Rise>

        <Rise index={2} style={{ marginTop: 22 }}>
          <Txt variant="label" style={{ fontFamily: fonts.sansSemibold }}>
            {t("Genres")}
          </Txt>
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GENRE_ORDER.map((genre) => {
              const selected = genres.includes(genre);
              return (
                <Chip
                  key={genre}
                  tone="card"
                  label={t(genre)}
                  icon={selected ? "check" : undefined}
                  selected={selected}
                  onPress={() => toggleGenre(genre)}
                />
              );
            })}
          </View>
        </Rise>

        <Rise index={3} style={{ marginTop: 24 }}>
          <Txt variant="label" style={{ fontFamily: fonts.sansSemibold }}>
            {t("Places")}
          </Txt>
          <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
            {home ? (
              <PlaceCard
                title={home.name}
                subtitle={t("Your country")}
                selected={places.includes(home.name)}
                onPress={() => togglePlace(home.name)}
                leading={<Flag code={home.code} size={21} />}
              />
            ) : null}

            {added.slice(0, home ? 1 : 2).map((place) => (
              <PlaceCard
                key={place}
                title={place}
                subtitle={t("Added by you")}
                selected
                onPress={() => togglePlace(place)}
                leading={
                  codeFor(place) ? (
                    <Flag code={codeFor(place)} size={21} />
                  ) : (
                    <Icon name="add_location_alt" size={22} color={colors.onInk} />
                  )
                }
              />
            ))}

            <PlaceCard
              title={t("Add a place")}
              subtitle={t("Any country")}
              selected={false}
              onPress={() => setPicker(true)}
              leading={<Icon name="add_location_alt" size={22} />}
            />
          </View>
          {places.length === 0 ? (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="public" size={16} color={colors.inkSoft} />
              <Txt variant="caption" color={colors.inkSoft}>
                {t("No place picked — we’ll look anywhere.")}
              </Txt>
            </View>
          ) : null}
        </Rise>

        <Rise index={4} style={{ marginTop: 24 }}>
          <Txt variant="label" style={{ fontFamily: fonts.sansSemibold }}>
            {t("Already have a station in mind?")}
          </Txt>
          <PressableScale
            onPress={() => finishOnboarding(router, "search")}
            pressedScale={0.985}
            accessibilityRole="search"
            accessibilityLabel={t("Search by name or call sign")}
            accessibilityHint={t("Skips the rest of setup and opens Search.")}
            style={{
              marginTop: 12,
              height: 50,
              borderRadius: 25,
              backgroundColor: colors.card,
              boxShadow: shadows.card,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 20,
            }}
          >
            <Icon name="search" size={22} color={colors.inkSoft} />
            <Txt variant="body" color={colors.inkFaint} style={{ fontSize: 16, lineHeight: 20 }}>
              {t("Search by name or call sign")}
            </Txt>
          </PressableScale>
        </Rise>

        <Rise index={5} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="info" size={16} color={colors.inkFaint} />
          <Txt variant="caption" color={colors.inkFaint} style={{ flex: 1 }}>
            {t("Availability depends on the station and your region.")}
          </Txt>
        </Rise>

        <View style={{ flex: 1, minHeight: 20 }} />

        <Rise index={6}>
          <Button label={t("Continue")} onPress={() => router.push("/onboarding/ready")} />
        </Rise>
      </ScrollView>

      <PickerSheet
        visible={picker}
        onClose={() => setPicker(false)}
        title={t("Country")}
        load={() => getCountries().then((list) => list.slice(0, 250))}
        onSelect={(country) => {
          if (country && !places.includes(country)) togglePlace(country);
        }}
      />
    </Screen>
  );
}
