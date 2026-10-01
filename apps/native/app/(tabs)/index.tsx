import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, View } from "react-native";

import { HeroCard } from "@/components/home/hero-card";
import { LastStationCard } from "@/components/home/last-station-card";
import { OfflineHome } from "@/components/home/offline-home";
import { SearchField } from "@/components/home/search-field";
import { StationRow } from "@/components/station/station-row";
import { StationCard, StationTile } from "@/components/station/station-tile";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo-mark";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton, TileRowSkeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { genreTag, getStarterStations } from "@/lib/recommendations";
import { useNetwork } from "@/stores/network";
import { useOnboarding } from "@/stores/onboarding";
import { usePlayer } from "@/stores/player";
import { useRecents } from "@/stores/recents";
import { GUTTER, colors, shadows } from "@/theme/tokens";

const DEFAULT_GENRES = ["News", "Music", "Jazz", "Classical"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A horizontal strip that bleeds to the screen edges and scrolls sideways. */
function Strip({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: GUTTER, gap }}
    >
      {children}
    </ScrollView>
  );
}

export default function Home() {
  const router = useRouter();
  const isConnected = useNetwork((s) => s.isConnected);

  const genres = useOnboarding((s) => s.genres);
  const places = useOnboarding((s) => s.places);
  const intents = useOnboarding((s) => s.intents);

  const recents = useRecents((s) => s.stations);
  const station = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  const recording = usePlayer((s) => s.recording);

  const starters = useAsync(`starters:${places.join(",")}:${genres.join(",")}`, () =>
    getStarterStations({ genres, places }),
  );

  if (!isConnected) return <OfflineHome />;

  const openStations = (params: Record<string, string>) =>
    router.push({ pathname: "/stations", params });

  // A station that's loaded but stopped is offered as Resume, never restarted.
  const lastStation = station && status === "stopped" && !recording ? station : null;
  const isFirstSession = recents.length === 0 && !lastStation;

  const stations = starters.data?.stations ?? [];
  const matched = starters.data?.matched ?? true;
  // Don't feature the station that's already sitting in the Resume card.
  const featured = stations.find((s) => s.stationuuid !== lastStation?.stationuuid) ?? null;
  const chipGenres = genres.length > 0 ? genres : DEFAULT_GENRES;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={starters.loading && starters.data !== null}
            onRefresh={starters.reload}
            tintColor={colors.inkSoft}
          />
        }
      >
        <View style={{ paddingHorizontal: GUTTER }}>
          <Rise style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LogoMark />
            <Txt variant="bodyLg" color={colors.inkSoft} style={{ flex: 1 }}>
              {greeting()}
            </Txt>
          </Rise>

          <Rise index={1} style={{ marginTop: 20 }}>
            <SearchField
              onPress={() => router.navigate({ pathname: "/search", params: { focus: "1" } })}
              onNearbyPress={() => router.push("/nearby")}
            />
          </Rise>

          {isFirstSession && intents.includes("known-station") ? (
            <Rise
              index={2}
              style={{
                marginTop: 10,
                paddingLeft: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="radio" size={16} color={colors.inkSoft} />
              <Txt variant="caption" color={colors.inkSoft}>
                Try a known station by name or call sign.
              </Txt>
            </Rise>
          ) : null}
        </View>

        <Rise index={2} style={{ marginTop: 14 }}>
          <Strip gap={8}>
            {places.map((place) => (
              <Chip
                key={place}
                label={place}
                icon="place"
                onPress={() => openStations({ title: place, country: place })}
              />
            ))}
            {chipGenres.map((genre) => (
              <Chip
                key={genre}
                label={genre}
                onPress={() => openStations({ title: genre, tag: genreTag(genre) })}
              />
            ))}
            <Chip label="Anywhere" icon="public" onPress={() => router.push("/browse")} />
          </Strip>
        </Rise>

        {lastStation ? (
          <Rise index={3} style={{ marginTop: 20, paddingHorizontal: GUTTER }}>
            <LastStationCard station={lastStation} />
          </Rise>
        ) : null}

        {/* First session: a row of starter cards. Afterwards: one featured station. */}
        {isFirstSession ? (
          <>
            <Rise index={3} style={{ marginTop: 26, paddingHorizontal: GUTTER }}>
              <SectionHeader
                large
                title={matched ? "For your first listen" : "Play from anywhere"}
                subtitle={
                  matched ? "Picked from your choices" : "Live now and popular around the world"
                }
              />
            </Rise>
            <View style={{ marginTop: 14 }}>
              {starters.data ? (
                <Strip>
                  {stations.slice(0, 6).map((s, i) => (
                    <StationCard key={s.stationuuid} station={s} index={i + 4} />
                  ))}
                </Strip>
              ) : (
                <View style={{ paddingHorizontal: GUTTER }}>
                  <TileRowSkeleton size={196} count={2} />
                </View>
              )}
            </View>
          </>
        ) : featured ? (
          <Rise index={lastStation ? 4 : 3} style={{ marginTop: 22, paddingHorizontal: GUTTER }}>
            <HeroCard station={featured} />
          </Rise>
        ) : starters.loading ? (
          <View style={{ marginTop: 22, paddingHorizontal: GUTTER }}>
            <Skeleton width="100%" height={208} radius={28} />
          </View>
        ) : null}

        {/* Nothing matched the listener's places and genres: say so, and offer ways on. */}
        {starters.data && !matched ? (
          <Rise index={5} style={{ marginTop: 22, paddingHorizontal: GUTTER }}>
            <Gradient
              colors={["#DAF3FE", "#EEECFF"]}
              angle={150}
              style={{ borderRadius: 28, padding: 20, paddingTop: 22, overflow: "hidden" }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.card,
                  boxShadow: shadows.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="travel_explore" size={24} color={colors.signalDeep} />
              </View>
              <Txt variant="titleSm" style={{ marginTop: 18, maxWidth: 280 }}>
                We’re still building coverage here.
              </Txt>
              <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 6 }}>
                Try another place or search by name.
              </Txt>
              <View style={{ gap: 8, marginTop: 18 }}>
                <Button
                  label="Choose another place"
                  icon="place"
                  height={46}
                  onPress={() => router.push("/browse")}
                />
                <Button
                  label="Search by name"
                  variant="card"
                  height={46}
                  onPress={() => router.navigate({ pathname: "/search", params: { focus: "1" } })}
                />
              </View>
            </Gradient>
          </Rise>
        ) : null}

        {starters.error && !starters.data ? (
          <Rise index={4} style={{ marginTop: 22, paddingHorizontal: GUTTER, gap: 12 }}>
            <Txt variant="body" color={colors.inkSoft}>
              The station directory isn’t responding. Your Favorites and Recents still work.
            </Txt>
            <Button
              label="Try again"
              icon="refresh"
              variant="outline"
              height={46}
              onPress={starters.reload}
              containerStyle={{ alignSelf: "flex-start" }}
            />
          </Rise>
        ) : null}

        {recents.length > 0 ? (
          <>
            <Rise index={5} style={{ marginTop: 26, paddingHorizontal: GUTTER }}>
              <SectionHeader
                title="Recent"
                actionLabel="See all"
                onAction={() => openStations({ title: "Recent", source: "recents" })}
              />
            </Rise>
            <View style={{ marginTop: 14 }}>
              <Strip>
                {recents.slice(0, 10).map((s, i) => (
                  <StationTile key={s.stationuuid} station={s} index={i + 6} />
                ))}
              </Strip>
            </View>
          </>
        ) : null}

        {/* After the first listen there's still more to offer below Recents. */}
        {!isFirstSession && stations.length > 1 ? (
          <View style={{ marginTop: 26, paddingHorizontal: GUTTER }}>
            <Rise index={7}>
              <SectionHeader
                title={matched ? "From your choices" : "Popular right now"}
                actionLabel="Browse"
                onAction={() => router.push("/browse")}
              />
            </Rise>
            <View style={{ marginTop: 4 }}>
              {stations
                .filter((s) => s.stationuuid !== featured?.stationuuid)
                .slice(0, 4)
                .map((s, i, list) => (
                  <StationRow
                    key={s.stationuuid}
                    station={s}
                    index={i + 8}
                    trailing="play"
                    divider={i < list.length - 1}
                  />
                ))}
            </View>
          </View>
        ) : null}

        {intents.includes("sleep") ? (
          <Rise index={8} style={{ marginTop: 20, paddingHorizontal: GUTTER }}>
            <PressableScale
              onPress={() => openStations({ title: "Wind down", tag: "ambient" })}
              accessibilityRole="button"
              accessibilityLabel="Wind down: calm stations and a sleep timer"
              style={{
                borderRadius: 24,
                backgroundColor: colors.night,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  right: -40,
                  top: -50,
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  borderWidth: 1,
                  borderColor: "rgba(160,200,255,0.2)",
                }}
              />
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="bedtime" size={22} color={colors.onInk} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="bodyLg" color={colors.onInk}>
                  Wind down
                </Txt>
                <Txt variant="caption" color="#B8BCC8">
                  Calm stations and a sleep timer, ready when you are.
                </Txt>
              </View>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#97D4F8",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="arrow_forward" size={20} />
              </View>
            </PressableScale>
          </Rise>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
