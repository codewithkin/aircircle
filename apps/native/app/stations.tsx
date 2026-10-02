import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StationListCard } from "@/components/station/station-list-card";
import { ActionRow } from "@/components/ui/action-row";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Flag } from "@/components/ui/flag";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { searchStations } from "@/lib/api/radio-browser";
import { genreTag } from "@/lib/recommendations";
import type { Station } from "@/lib/types";
import { useNetwork } from "@/stores/network";
import { useOnboarding } from "@/stores/onboarding";
import { useRecents } from "@/stores/recents";
import { GUTTER, colors, shadows } from "@/theme/tokens";
import { msg, t } from "@/lib/i18n";

const PAGE = 40;

/** Genre names are data here — the keys the directory tags are looked up by. */
const FALLBACK_GENRES = [msg("News"), msg("Music"), msg("Jazz"), msg("Classical"), msg("Talk")];

type Params = {
  title?: string;
  country?: string;
  /** Country code: draws the flag, and is the filter when no country name is given. */
  code?: string;
  state?: string;
  tag?: string;
  language?: string;
  /** "recents" lists the listener's own history instead of the directory. */
  source?: string;
};

/**
 * A list of stations for one place, genre or language — where Browse, Home's
 * chips and search suggestions all lead. Genre chips narrow it in place.
 */
export default function Stations() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isConnected = useNetwork((s) => s.isConnected);

  const preferredGenres = useOnboarding((s) => s.genres);
  const recents = useRecents((s) => s.stations);
  const isRecents = params.source === "recents";

  // A genre list is already narrowed to one genre; only places offer the chips.
  const canNarrow = !isRecents && !params.tag;
  const [genre, setGenre] = useState<string | null>(null);
  const tag = params.tag ?? (genre ? genreTag(genre) : undefined);

  const key = isRecents
    ? null
    : `stations:${params.country}:${params.code}:${params.state}:${tag}:${params.language}`;

  const result = useAsync<Station[]>(key && isConnected ? key : null, () =>
    searchStations({
      country: params.country,
      // Nearby knows the country by its code rather than the directory's name for it.
      countryCode: params.country ? undefined : params.code || undefined,
      state: params.state,
      tag,
      language: params.language,
      limit: PAGE,
    }),
  );

  const stations = isRecents ? recents : (result.data ?? []);
  const loading = !isRecents && result.loading && result.data === null;
  const title = params.title ?? t("Stations");
  const chips = preferredGenres.length > 0 ? preferredGenres : FALLBACK_GENRES;

  const header = (
    <View>
      <Rise style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: -10 }}>
        <IconButton icon="arrow_back" accessibilityLabel={t("Back")} onPress={() => router.back()} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Flag code={params.code} size={21} />
          <Txt variant="titleLg" accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Txt>
        </View>
        <IconButton
          icon="search"
          background={colors.card}
          shadow
          accessibilityLabel={t("Search stations")}
          onPress={() => router.navigate({ pathname: "/search", params: { focus: String(Date.now()) } })}
        />
      </Rise>

      <Rise index={1}>
        <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 6, lineHeight: 20 }}>
          {isRecents
            ? t("Stations you’ve played, newest first. Saved on this device.")
            : t("Most listened first. Availability depends on the station and your region.")}
        </Txt>
      </Rise>

      {canNarrow ? (
        <Rise index={2} style={{ marginTop: 16, marginHorizontal: -GUTTER }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }}
          >
            <Chip label={t("All")} selected={genre === null} onPress={() => setGenre(null)} />
            {chips.map((g) => (
              <Chip key={g} label={t(g)} selected={genre === g} onPress={() => setGenre(g)} />
            ))}
          </ScrollView>
        </Rise>
      ) : null}

      <View style={{ height: 18 }} />
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: 10 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} width="100%" height={96} radius={24} />
      ))}
    </View>
  ) : !isConnected && !isRecents ? (
    <Rise>
      <Txt variant="displaySm">{t("Station lists need a connection.")}</Txt>
      <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 10 }}>
        {t("Your Favorites and Recents are still available.")}
      </Txt>
      <Button
        label={t("Retry")}
        icon="refresh"
        variant="signal"
        height={52}
        onPress={() => void useNetwork.getState().check()}
        containerStyle={{ marginTop: 20, alignSelf: "flex-start" }}
      />
    </Rise>
  ) : result.error ? (
    <Rise>
      <Txt variant="displaySm">{t("The directory isn’t responding.")}</Txt>
      <Button
        label={t("Try again")}
        icon="refresh"
        variant="signal"
        height={52}
        onPress={result.reload}
        containerStyle={{ marginTop: 20, alignSelf: "flex-start" }}
      />
    </Rise>
  ) : (
    // Coverage varies: say so plainly and offer the ways out.
    <Rise>
      <Txt variant="titleSm">
        {isRecents
          ? t("Stations you play will appear here.")
          : t("We don’t have playable stations for this selection yet.")}
      </Txt>
      <View
        style={{
          marginTop: 18,
          borderRadius: 22,
          backgroundColor: colors.card,
          boxShadow: shadows.card,
          paddingHorizontal: 16,
          paddingVertical: 4,
        }}
      >
        {genre ? (
          <ActionRow
            icon="manage_search"
            title={t("Broaden the selection")}
            subtitle={t("Show every genre in {{title}}", { title })}
            onPress={() => setGenre(null)}
          />
        ) : null}
        <ActionRow
          icon="explore"
          tone="ok"
          title={t("Choose another place or genre")}
          subtitle={t("Country, city, language")}
          onPress={() => router.replace("/browse")}
        />
        <ActionRow
          icon="search"
          tone="violet"
          title={t("Search by name")}
          subtitle={t("Find a station you already know")}
          divider={false}
          onPress={() => router.navigate({ pathname: "/search", params: { focus: String(Date.now()) } })}
        />
      </View>
    </Rise>
  );

  return (
    <Screen>
      <FlatList
        data={stations}
        keyExtractor={(s) => s.stationuuid}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: 14,
          paddingBottom: insets.bottom + 24,
          gap: 10,
        }}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: -10 }}
        ListEmptyComponent={empty}
        // Only the first screenful staggers in; rows met while scrolling appear at once.
        renderItem={({ item, index }) => (
          <StationListCard station={item} index={index < 6 ? index + 3 : 0} />
        )}
        // Rows are remounted as filters change; keep the first screenful cheap.
        initialNumToRender={8}
        windowSize={7}
      />
    </Screen>
  );
}
