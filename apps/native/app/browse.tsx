import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useRef, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GenreGrid } from "@/components/browse/genre-grid";
import { PickerSheet } from "@/components/search/picker-sheet";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/controls";
import { Flag } from "@/components/ui/flag";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow } from "@/components/ui/section-header";
import { RowListSkeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { getCountries, getCountryStates, getGenres, getLanguages } from "@/lib/api/radio-browser";
import { localTimeIn } from "@/lib/country-time";
import type { BrowseEntry } from "@/lib/api/radio-browser";
import { haptics } from "@/lib/haptics";
import { genreTag } from "@/lib/recommendations";
import { useOnboarding } from "@/stores/onboarding";
import { timing } from "@/theme/motion";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";

type Tab = "country" | "city" | "language" | "genre";

const TABS: { value: Tab; label: string }[] = [
  { value: "country", label: "Country" },
  { value: "city", label: "City" },
  { value: "language", label: "Language" },
  { value: "genre", label: "Genre" },
];

const ROW_HEIGHT = 66;

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** A row in the big-type lists: a name you can read from arm's length. */
function BigRow({
  entry,
  label,
  onPress,
  highlight,
}: {
  entry: BrowseEntry;
  label: string;
  onPress: () => void;
  /** Small caps under the name, e.g. "YOUR COUNTRY". */
  highlight?: string;
}) {
  // For countries: the local time there, so the list hints at who is on air.
  const time = localTimeIn(entry.code);

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${entry.stationCount} stations`}
      style={{
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
      }}
    >
      {entry.code ? <Flag code={entry.code} size={24} /> : null}
      <View style={{ flex: 1, gap: 3 }}>
        <Txt
          numberOfLines={1}
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: highlight ? 26 : 28,
            lineHeight: highlight ? 28 : 32,
            letterSpacing: -0.9,
            color: colors.ink,
          }}
        >
          {label}
        </Txt>
        {highlight ? <Eyebrow color={colors.inkSoft}>{highlight}</Eyebrow> : null}
      </View>
      {time ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="schedule" size={15} color={colors.inkSoft} />
          <Txt variant="meta" color={colors.inkSoft} style={{ fontVariant: ["tabular-nums"] }}>
            {time}
          </Txt>
        </View>
      ) : (
        <Txt variant="meta" color={colors.inkSoft} style={{ fontVariant: ["tabular-nums"] }}>
          {entry.stationCount.toLocaleString()}
        </Txt>
      )}
    </PressableScale>
  );
}

/**
 * The A–Z rail. Drag a thumb along it to jump through the list; the current
 * letter is marked with a pill that follows the thumb.
 */
function LetterRail({
  letters,
  active,
  onJump,
}: {
  letters: string[];
  active: string | null;
  onJump: (letter: string) => void;
}) {
  const height = useRef(0);
  const last = useRef<string | null>(null);

  const pick = (e: GestureResponderEvent) => {
    if (height.current === 0 || letters.length === 0) return;
    const ratio = Math.min(0.999, Math.max(0, e.nativeEvent.locationY / height.current));
    const letter = letters[Math.floor(ratio * letters.length)];
    if (letter && letter !== last.current) {
      last.current = letter;
      haptics.tap();
      onJump(letter);
    }
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Jump to a letter"
      onLayout={(e) => {
        height.current = e.nativeEvent.layout.height;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={() => {
        last.current = null;
      }}
      style={{ width: 28, alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}
    >
      {letters.map((letter) => {
        const on = letter === active;
        return (
          <MotiView
            key={letter}
            pointerEvents="none"
            animate={{ backgroundColor: on ? colors.ink : "rgba(16,17,20,0)", scale: on ? 1.15 : 1 }}
            transition={timing.quick}
            style={{ width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Txt
              variant="tab"
              color={on ? colors.onInk : colors.inkFaint}
              style={{ fontFamily: fonts.sansSemibold, fontSize: 10, lineHeight: 12 }}
            >
              {letter}
            </Txt>
          </MotiView>
        );
      })}
    </View>
  );
}

export default function Browse() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<BrowseEntry>>(null);

  const places = useOnboarding((s) => s.places);
  const genrePicks = useOnboarding((s) => s.genres);

  const [tab, setTab] = useState<Tab>(params.tab ?? "country");
  const [country, setCountry] = useState<string | null>(places[0] ?? null);
  const [countryPicker, setCountryPicker] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const countries = useAsync(tab === "country" ? "browse:countries" : null, () =>
    getCountries().then((list) => [...list].sort((a, b) => a.name.localeCompare(b.name))),
  );
  const cities = useAsync(tab === "city" && country ? `browse:cities:${country}` : null, () =>
    getCountryStates(country!).then((list) => list.slice(0, 120)),
  );
  const languages = useAsync(tab === "language" ? "browse:languages" : null, () =>
    getLanguages().then((list) => list.slice(0, 120)),
  );
  const moreGenres = useAsync(tab === "genre" ? "browse:genres" : null, () => getGenres(undefined, 40));

  const openStations = (p: Record<string, string>) => router.push({ pathname: "/stations", params: p });

  // The listener's own places lead the country list.
  const countryRows = countries.data ?? [];
  const mine = countryRows.filter((c) => places.includes(c.name));
  const orderedCountries = [...mine, ...countryRows.filter((c) => !places.includes(c.name))];
  const letters = Array.from(new Set(countryRows.map((c) => c.name[0]?.toUpperCase()).filter(Boolean))) as string[];

  const jumpTo = (letter: string) => {
    setActiveLetter(letter);
    const index = orderedCountries.findIndex(
      (c, i) => i >= mine.length && c.name[0]?.toUpperCase() === letter,
    );
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: false });
  };

  const list = (
    data: BrowseEntry[],
    state: { loading: boolean; error: boolean; reload: () => void },
    renderRow: (entry: BrowseEntry, index: number) => React.ReactElement,
    emptyText: string,
  ) =>
    state.loading && data.length === 0 ? (
      <View style={{ paddingHorizontal: GUTTER }}>
        <RowListSkeleton count={6} />
      </View>
    ) : state.error && data.length === 0 ? (
      <View style={{ paddingHorizontal: GUTTER, gap: 14, marginTop: 20 }}>
        <Txt variant="body" color={colors.inkSoft}>
          Couldn’t load this list. Check your connection.
        </Txt>
        <Button
          label="Try again"
          icon="refresh"
          variant="outline"
          height={46}
          onPress={state.reload}
          containerStyle={{ alignSelf: "flex-start" }}
        />
      </View>
    ) : data.length === 0 ? (
      <Txt variant="body" color={colors.inkSoft} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
        {emptyText}
      </Txt>
    ) : (
      <FlatList
        data={data}
        keyExtractor={(item) => item.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item, index }) => renderRow(item, index)}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        initialNumToRender={12}
      />
    );

  return (
    <Screen>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
        <Rise style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: -10 }}>
          <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} />
          <Txt variant="titleLg" accessibilityRole="header" style={{ flex: 1, fontSize: 28 }}>
            Browse
          </Txt>
          <IconButton
            icon="search"
            accessibilityLabel="Search stations"
            onPress={() => router.navigate({ pathname: "/search", params: { focus: String(Date.now()) } })}
          />
        </Rise>

        <Rise index={1} style={{ marginTop: 14 }}>
          <Segmented options={TABS} value={tab} onChange={setTab} accessibilityLabel="Browse by" />
        </Rise>
      </View>

      {/* Keyed by tab so each list arrives with its own entrance. */}
      <MotiView
        key={tab}
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={timing.enter}
        style={{ flex: 1, marginTop: 14 }}
      >
        {tab === "country" ? (
          <>
            <View style={{ paddingHorizontal: GUTTER, marginBottom: 6 }}>
              <PressableScale
                onPress={() => router.push("/nearby")}
                pressedScale={0.985}
                accessibilityRole="button"
                accessibilityLabel="Find stations near you"
                style={{
                  borderRadius: 18,
                  backgroundColor: colors.card,
                  boxShadow: shadows.hairline,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                }}
              >
                <Icon name="near_me" size={20} />
                <Txt variant="meta" style={{ flex: 1 }}>
                  Stations near you
                </Txt>
                <Txt variant="label" style={{ fontFamily: fonts.sansSemibold }}>
                  Find
                </Txt>
              </PressableScale>
            </View>

            <View style={{ flex: 1, flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                {countries.loading && orderedCountries.length === 0 ? (
                  <View style={{ paddingHorizontal: GUTTER }}>
                    <RowListSkeleton count={6} />
                  </View>
                ) : (
                  <FlatList
                    ref={listRef}
                    data={orderedCountries}
                    keyExtractor={(item, index) => `${item.name}-${index}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingLeft: GUTTER,
                      paddingRight: 6,
                      paddingBottom: insets.bottom + 24,
                    }}
                    getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
                    initialNumToRender={12}
                    onScrollToIndexFailed={() => {}}
                    ListEmptyComponent={
                      <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 20 }}>
                        {countries.error
                          ? "Couldn’t load countries. Check your connection."
                          : "No countries to show."}
                      </Txt>
                    }
                    renderItem={({ item, index }) => (
                      <BigRow
                        entry={item}
                        label={item.name}
                        highlight={index < mine.length ? "Your place" : undefined}
                        onPress={() =>
                          openStations({ title: item.name, country: item.name, code: item.code ?? "" })
                        }
                      />
                    )}
                  />
                )}
              </View>
              {letters.length > 0 ? (
                <View style={{ paddingRight: 6, paddingBottom: insets.bottom + 24 }}>
                  <LetterRail letters={letters} active={activeLetter} onJump={jumpTo} />
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {tab === "city" ? (
          <>
            <View style={{ paddingHorizontal: GUTTER, flexDirection: "row", marginBottom: 6 }}>
              <Chip
                label={country ?? "Choose a country"}
                icon="place"
                trailingIcon="expand_more"
                tone={country ? "signal" : "card"}
                selected={!!country}
                onPress={() => setCountryPicker(true)}
              />
            </View>
            {country ? (
              list(
                cities.data ?? [],
                cities,
                (item) => (
                  <BigRow
                    entry={item}
                    label={item.name}
                    onPress={() => openStations({ title: item.name, country, state: item.name })}
                  />
                ),
                `No cities or regions are listed for ${country} yet. Coverage varies by country.`,
              )
            ) : (
              <Txt variant="body" color={colors.inkSoft} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
                Pick a country to see its cities and regions.
              </Txt>
            )}
          </>
        ) : null}

        {tab === "language"
          ? list(
              languages.data ?? [],
              languages,
              (item) => (
                <BigRow
                  entry={item}
                  label={titleCase(item.name)}
                  onPress={() => openStations({ title: titleCase(item.name), language: item.name })}
                />
              ),
              "No languages to show.",
            )
          : null}

        {tab === "genre" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 24 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Icon name="info" size={16} color={colors.inkFaint} />
              <Txt variant="caption" color={colors.inkFaint} style={{ flex: 1 }}>
                Availability depends on the station and your region.
              </Txt>
            </View>

            <GenreGrid
              picks={genrePicks}
              onSelect={(genre) => openStations({ title: genre, tag: genreTag(genre) })}
            />

            {(moreGenres.data ?? []).length > 0 ? (
              <View style={{ marginTop: 26 }}>
                <Eyebrow>More genres</Eyebrow>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {(moreGenres.data ?? []).map((g) => (
                    <Chip
                      key={g.name}
                      tone="card"
                      label={titleCase(g.name)}
                      onPress={() => openStations({ title: titleCase(g.name), tag: g.name })}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </MotiView>

      <PickerSheet
        visible={countryPicker}
        onClose={() => setCountryPicker(false)}
        title="Country"
        load={() => getCountries().then((l) => l.slice(0, 250))}
        selected={country}
        onSelect={setCountry}
      />
    </Screen>
  );
}
