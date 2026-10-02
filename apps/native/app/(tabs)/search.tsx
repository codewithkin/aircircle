import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Linking, Pressable, ScrollView, TextInput, View } from "react-native";

import { FiltersSheet } from "@/components/search/filters-sheet";
import { PickerSheet } from "@/components/search/picker-sheet";
import { TopResult } from "@/components/search/top-result";
import { StationRow } from "@/components/station/station-row";
import { ActionRow } from "@/components/ui/action-row";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Eyebrow } from "@/components/ui/section-header";
import { RowListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { getCountries, getGenres, getLanguages, searchStations } from "@/lib/api/radio-browser";
import type { BrowseEntry } from "@/lib/api/radio-browser";
import { haptics } from "@/lib/haptics";
import { REPORT_EMAIL } from "@/lib/report";
import type { Station } from "@/lib/types";
import { useNetwork } from "@/stores/network";
import { useRecentSearches } from "@/stores/recent-searches";
import { timing } from "@/theme/motion";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

type Scope = "all" | "stations" | "places" | "genres";
type Filter = "country" | "genre" | "language";

type Results = { stations: Station[]; places: BrowseEntry[]; genres: BrowseEntry[] };

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: msg("All") },
  { value: "stations", label: msg("Stations") },
  { value: "places", label: msg("Places") },
  { value: "genres", label: msg("Genres") },
];

/** Results wait this long after the last keystroke, so typing never stutters. */
const DEBOUNCE_MS = 280;

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function ScopeTab({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number | null;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count === null ? label : t("{{label}}, {{count}} results", { label, count })}
      style={{ paddingHorizontal: 10, justifyContent: "center" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Txt
          variant="label"
          color={active ? colors.signal : colors.inkSoft}
          style={{ fontFamily: active ? fonts.sansSemibold : fonts.sansMedium }}
        >
          {label}
        </Txt>
        {count !== null ? (
          <View
            style={{
              height: 20,
              minWidth: 20,
              borderRadius: 10,
              paddingHorizontal: 6,
              backgroundColor: active ? colors.signal : colors.chip,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt
              variant="tab"
              color={active ? colors.onInk : colors.inkSoft}
              style={{ fontFamily: fonts.sansSemibold, fontSize: 11 }}
            >
              {count}
            </Txt>
          </View>
        ) : null}
      </View>
      {/* The underline grows from the middle as its tab becomes active. */}
      <MotiView
        animate={{ scaleX: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={timing.base}
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 0,
          height: 3,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
          backgroundColor: colors.signal,
        }}
      />
    </Pressable>
  );
}

export default function Search() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string; q?: string }>();
  const inputRef = useRef<TextInput>(null);
  const isConnected = useNetwork((s) => s.isConnected);

  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [filters, setFilters] = useState<Record<Filter, string | null>>({
    country: null,
    genre: null,
    language: null,
  });
  const [picker, setPicker] = useState<Filter | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const recentSearches = useRecentSearches((s) => s.queries);

  // Home's search field and onboarding both arrive wanting the keyboard up.
  useEffect(() => {
    if (!params.focus) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [params.focus]);

  useEffect(() => {
    if (params.q) setText(params.q);
  }, [params.q]);

  // The field itself responds instantly; only the request is debounced.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const hasFilters = !!(filters.country || filters.genre || filters.language);
  const active = query.length >= 2 || hasFilters;

  const results = useAsync<Results>(
    active && isConnected
      ? `search:${query}:${filters.country}:${filters.genre}:${filters.language}`
      : null,
    async () => {
      const [stations, places, genres] = await Promise.all([
        searchStations({
          name: query || undefined,
          country: filters.country ?? undefined,
          tag: filters.genre ?? undefined,
          language: filters.language ?? undefined,
          limit: 30,
        }),
        query.length >= 2 ? getCountries(query).catch(() => []) : Promise.resolve([]),
        query.length >= 2 ? getGenres(query, 8).catch(() => []) : Promise.resolve([]),
      ]);
      return { stations, places: places.slice(0, 5), genres: genres.slice(0, 8) };
    },
  );

  // Remember a search once it has actually found something.
  const foundAny = (results.data?.stations.length ?? 0) > 0;
  useEffect(() => {
    if (!foundAny || query.length < 2) return;
    const timer = setTimeout(() => useRecentSearches.getState().add(query), 1500);
    return () => clearTimeout(timer);
  }, [foundAny, query]);

  const stations = results.data?.stations ?? [];
  const places = results.data?.places ?? [];
  const genres = results.data?.genres ?? [];
  const total = stations.length + places.length + genres.length;
  const counts: Record<Scope, number> = {
    all: total,
    stations: stations.length,
    places: places.length,
    genres: genres.length,
  };

  const showStations = scope === "all" || scope === "stations";
  const showPlaces = (scope === "all" || scope === "places") && places.length > 0;
  const showGenres = (scope === "all" || scope === "genres") && genres.length > 0;
  const scopeEmpty = results.data !== null && counts[scope] === 0;
  const loadingFirst = results.loading && results.data === null;

  const clear = () => {
    setText("");
    setQuery("");
    setScope("all");
    inputRef.current?.focus();
  };

  const openStations = (p: Record<string, string>) => router.push({ pathname: "/stations", params: p });
  const firstWord = query.split(/\s+/)[0];

  return (
    <Screen>
      <View style={{ paddingHorizontal: GUTTER - 8, paddingTop: 8 }}>
        <Rise offset={8}>
          <View
            style={{
              borderRadius: 28,
              backgroundColor: colors.card,
              borderWidth: 2,
              borderColor: colors.signal,
              boxShadow: `0 0 0 5px rgba(36,143,204,0.13), ${shadows.signal}`,
              overflow: "hidden",
            }}
          >
            <View
              style={{ height: 58, flexDirection: "row", alignItems: "center", paddingRight: 8, paddingLeft: 2 }}
            >
              <IconButton
                icon="arrow_back"
                accessibilityLabel={t("Back to Home")}
                onPress={() => {
                  Keyboard.dismiss();
                  router.navigate("/");
                }}
              />
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={t("Station, city or genre")}
                placeholderTextColor={colors.inkFaint}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                selectionColor={colors.signal}
                accessibilityLabel={t("Search live radio")}
                onSubmitEditing={() => {
                  if (text.trim()) useRecentSearches.getState().add(text);
                }}
                style={{
                  flex: 1,
                  fontFamily: fonts.sansMedium,
                  fontSize: 20,
                  letterSpacing: -0.2,
                  color: colors.ink,
                  padding: 0,
                }}
              />
              {results.data && active ? (
                <Txt variant="captionMedium" color={colors.inkSoft} style={{ paddingHorizontal: 6 }}>
                  {stations.length} found
                </Txt>
              ) : null}
              {text.length > 0 ? (
                <IconButton
                  icon="close"
                  size={38}
                  iconSize={18}
                  background={colors.chip}
                  accessibilityLabel={t("Clear search")}
                  onPress={clear}
                />
              ) : null}
            </View>

            <View style={{ height: 1, backgroundColor: colors.hairline, marginHorizontal: 18 }} />

            <View accessibilityRole="tablist" style={{ height: 46, flexDirection: "row", paddingHorizontal: 10, gap: 2 }}>
              {SCOPES.map((s) => (
                <ScopeTab
                  key={s.value}
                  label={t(s.label)}
                  count={results.data && active ? counts[s.value] : null}
                  active={scope === s.value}
                  onPress={() => setScope(s.value)}
                />
              ))}
            </View>
          </View>
        </Rise>
      </View>

      <Rise index={1} style={{ marginTop: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }}
        >
          <Chip
            label={t("Filters")}
            icon="tune"
            tone={hasFilters ? "signal" : "chip"}
            selected={hasFilters}
            onPress={() => setFiltersOpen(true)}
          />
          {(
            [
              ["country", t("Country")],
              ["genre", t("Genre")],
              ["language", t("Language")],
            ] as const
          ).map(([key, label]) =>
            filters[key] ? (
              <Chip
                key={key}
                tone="signal"
                selected
                label={titleCase(filters[key])}
                trailingIcon="close"
                accessibilityLabel={t("Remove {{label}} filter: {{value}}", { label: label.toLowerCase(), value: filters[key] })}
                onPress={() => setFilters((f) => ({ ...f, [key]: null }))}
              />
            ) : (
              <Chip key={key} label={label} trailingIcon="expand_more" onPress={() => setPicker(key)} />
            ),
          )}
        </ScrollView>
      </Rise>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 24 }}
      >
        {!isConnected ? (
          <Rise>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.card,
                boxShadow: shadows.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="wifi_off" size={26} />
            </View>
            <Txt variant="displaySm" style={{ marginTop: 22, maxWidth: 300 }}>
              {t("Station search needs a connection.")}
            </Txt>
            <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10, maxWidth: 300 }}>
              {t("Your Favorites and Recents are still available.")}
            </Txt>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
              <Button
                label={t("Retry")}
                icon="refresh"
                variant="signal"
                height={52}
                onPress={() => void useNetwork.getState().check()}
              />
              <Button
                label={t("Open Favorites")}
                variant="outline"
                height={52}
                onPress={() => router.navigate("/favorites")}
              />
            </View>
          </Rise>
        ) : !active ? (
          // Nothing typed yet: recent searches and ways in.
          <>
            {recentSearches.length > 0 ? (
              <Rise index={2}>
                <Eyebrow>{t("Recent searches")}</Eyebrow>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {recentSearches.map((q) => (
                    <Chip
                      key={q}
                      tone="card"
                      icon="history"
                      label={q}
                      onPress={() => setText(q)}
                      onLongPress={() => {
                        haptics.lift();
                        useRecentSearches.getState().remove(q);
                      }}
                      accessibilityLabel={t("Search for {{q}}. Long press to delete.", { q })}
                    />
                  ))}
                </View>
              </Rise>
            ) : null}
            <Rise
              index={3}
              style={{
                marginTop: recentSearches.length > 0 ? 24 : 0,
                borderRadius: 22,
                backgroundColor: colors.card,
                boxShadow: shadows.card,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}
            >
              <ActionRow
                icon="explore"
                tone="ok"
                title={t("Browse by place or genre")}
                subtitle={t("Country, city, language")}
                onPress={() => router.push("/browse")}
              />
              <ActionRow
                icon="near_me"
                title={t("Stations near you")}
                subtitle={t("Uses your approximate location")}
                onPress={() => router.push("/nearby")}
                divider={false}
              />
            </Rise>
          </>
        ) : loadingFirst ? (
          <>
            <Skeleton width="100%" height={168} radius={28} />
            <View style={{ marginTop: 16 }}>
              <RowListSkeleton count={4} />
            </View>
          </>
        ) : results.error && !results.data ? (
          <Rise>
            <Txt variant="displaySm" style={{ maxWidth: 300 }}>
              {t("The directory isn’t responding.")}
            </Txt>
            <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10 }}>
              {t("This is usually brief. Your search is still here.")}
            </Txt>
            <Button
              label={t("Try again")}
              icon="refresh"
              variant="signal"
              height={52}
              onPress={results.reload}
              containerStyle={{ marginTop: 22, alignSelf: "flex-start" }}
            />
          </Rise>
        ) : total === 0 || scopeEmpty ? (
          // Nothing found: say why it might be, and give three ways on.
          <>
            <Rise>
              <View
                style={{
                  position: "absolute",
                  right: -80,
                  top: -60,
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: "#C9CCD4",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: -30,
                  top: -10,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "#DAF3FE",
                }}
              />
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.card,
                  boxShadow: shadows.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="search_off" size={26} />
              </View>
              <Txt variant="displaySm" accessibilityRole="header" style={{ marginTop: 22, maxWidth: 300 }}>
                {t("No playable station found.")}
              </Txt>
              <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10, maxWidth: 300 }}>
                {t("It may not be indexed yet, or it may have changed its name.")}
              </Txt>
            </Rise>

            <Rise
              index={1}
              style={{
                marginTop: 24,
                borderRadius: 22,
                backgroundColor: colors.card,
                boxShadow: shadows.card,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}
            >
              {scopeEmpty && total > 0 ? (
                <ActionRow
                  icon="manage_search"
                  title={t("Show all results")}
                  subtitle={t("{{number}} in other tabs", { number: total })}
                  onPress={() => setScope("all")}
                />
              ) : hasFilters ? (
                <ActionRow
                  icon="manage_search"
                  title={t("Remove filters")}
                  subtitle={t("Search every country, genre and language")}
                  onPress={() => setFilters({ country: null, genre: null, language: null })}
                />
              ) : firstWord && firstWord !== query ? (
                <ActionRow
                  icon="manage_search"
                  title={t("Broaden your search")}
                  subtitle={t("Search “{{firstWord}}” instead", { firstWord })}
                  onPress={() => setText(firstWord)}
                />
              ) : null}
              <ActionRow
                icon="explore"
                tone="ok"
                title={t("Browse by place or genre")}
                subtitle={t("Country, city, language")}
                onPress={() => router.push("/browse")}
              />
              <ActionRow
                icon="add_circle"
                tone="violet"
                title={t("Request this station")}
                subtitle={t("Send the name to our directory team")}
                divider={false}
                onPress={() =>
                  void Linking.openURL(
                    `mailto:${REPORT_EMAIL ?? ""}?subject=${encodeURIComponent(
                      t("Station request: {{query}}", { query }),
                    )}`,
                  ).catch(() => {})
                }
              />
            </Rise>

            {recentSearches.length > 0 ? (
              <Rise index={2} style={{ marginTop: 24 }}>
                <Eyebrow>{t("Recent searches")}</Eyebrow>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {recentSearches.slice(0, 6).map((q) => (
                    <Chip key={q} tone="card" icon="history" label={q} onPress={() => setText(q)} />
                  ))}
                </View>
              </Rise>
            ) : null}
          </>
        ) : (
          // Keyed by query so each new result set gets its own entrance.
          <View key={`${query}:${scope}`} style={{ opacity: results.loading ? 0.6 : 1 }}>
            {showStations && stations.length > 0 ? (
              <>
                <Rise>
                  <Eyebrow>{t("Top result")}</Eyebrow>
                </Rise>
                <Rise index={1} style={{ marginTop: 12 }}>
                  <TopResult station={stations[0]} />
                </Rise>

                {stations.length > 1 ? (
                  <>
                    <Rise index={2} style={{ marginTop: 24 }}>
                      <Eyebrow>{t("Stations")}</Eyebrow>
                    </Rise>
                    <View style={{ marginTop: 2 }}>
                      {stations.slice(1).map((s, i, list) => (
                        <StationRow
                          key={s.stationuuid}
                          station={s}
                          index={i + 3}
                          divider={i < list.length - 1}
                          swipeToFavorite
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : null}

            {showPlaces ? (
              <Rise index={4} style={{ marginTop: showStations && stations.length > 0 ? 24 : 0 }}>
                <Eyebrow>{t("Places")}</Eyebrow>
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 22,
                    backgroundColor: colors.card,
                    boxShadow: shadows.card,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                  }}
                >
                  {places.map((p, i) => (
                    <ActionRow
                      key={p.name}
                      icon="place"
                      tone="neutral"
                      title={p.name}
                      subtitle={t("{{number}} stations", { number: p.stationCount.toLocaleString() })}
                      divider={i < places.length - 1}
                      onPress={() => openStations({ title: p.name, country: p.name })}
                    />
                  ))}
                </View>
              </Rise>
            ) : null}

            {showGenres ? (
              <Rise index={5} style={{ marginTop: 24 }}>
                <Eyebrow>{t("Genres")}</Eyebrow>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {genres.map((g) => (
                    <Chip
                      key={g.name}
                      tone="card"
                      label={titleCase(g.name)}
                      onPress={() => openStations({ title: titleCase(g.name), tag: g.name })}
                    />
                  ))}
                </View>
              </Rise>
            ) : null}
          </View>
        )}
      </ScrollView>

      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onPick={setPicker}
        onClear={() => setFilters({ country: null, genre: null, language: null })}
        onBrowse={() => router.push("/browse")}
      />
      <PickerSheet
        visible={picker === "country"}
        onClose={() => setPicker(null)}
        title={t("Country")}
        load={() => getCountries().then((list) => list.slice(0, 250))}
        selected={filters.country}
        onSelect={(country) => setFilters((f) => ({ ...f, country }))}
      />
      <PickerSheet
        visible={picker === "genre"}
        onClose={() => setPicker(null)}
        title={t("Genre")}
        load={() => getGenres(undefined, 120)}
        selected={filters.genre}
        onSelect={(genre) => setFilters((f) => ({ ...f, genre }))}
      />
      <PickerSheet
        visible={picker === "language"}
        onClose={() => setPicker(null)}
        title={t("Language")}
        load={() => getLanguages().then((list) => list.slice(0, 150))}
        selected={filters.language}
        onSelect={(language) => setFilters((f) => ({ ...f, language }))}
      />
    </Screen>
  );
}
