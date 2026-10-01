import { useRouter } from "expo-router";
import { MotiView } from "moti";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StationArt } from "@/components/station/station-art";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EqBars, LiveDot } from "@/components/ui/live";
import { LogoMark } from "@/components/ui/logo-mark";
import { Rise } from "@/components/ui/rise";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Txt } from "@/components/ui/txt";
import { useAsync } from "@/hooks/use-async";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getTopStations } from "@/lib/api/radio-browser";
import { finishOnboarding } from "@/lib/onboarding";
import { stationGenres, stationSubtitle } from "@/lib/station";
import { springs } from "@/theme/motion";
import { GUTTER, colors, fonts, shadows } from "@/theme/tokens";

/**
 * A piece of the preview: springs into place, then drifts very slightly so the
 * composition feels alive without anything actually moving around.
 */
function Floating({
  children,
  delay,
  drift = 5,
  style,
}: {
  children: ReactNode;
  delay: number;
  drift?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();

  return (
    <MotiView
      from={{ opacity: 0, translateY: reduced ? 0 : 26, scale: reduced ? 1 : 0.94 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ ...springs.settle, delay }}
      style={[{ position: "absolute" }, style]}
    >
      <MotiView
        from={{ translateY: 0 }}
        animate={{ translateY: reduced ? 0 : -drift }}
        transition={{
          type: "timing",
          duration: 3200 + delay,
          delay: 900 + delay,
          loop: !reduced,
          repeatReverse: true,
        }}
      >
        {children}
      </MotiView>
    </MotiView>
  );
}

/**
 * The first screen: the product in action rather than a description of it.
 * The search, the result and the player are real parts showing a real station
 * from the directory — nothing here is invented.
 */
export default function Preview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const top = useAsync("onboarding:preview", () => getTopStations(1));
  const station = top.data?.[0] ?? null;
  const genre = station ? stationGenres(station, 1) : "";

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: GUTTER }}>
        <View style={{ flex: 1, minHeight: 360, marginHorizontal: -GUTTER }}>
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
            <View
              style={{ position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: "#DAF3FE" }}
            />
            <View
              style={{ position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#C2E8F8" }}
            />
            <View
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: 90,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.9)",
              }}
            />
          </View>

          <Floating delay={120} style={{ left: 28, top: 34, right: 84 }}>
            <View
              style={{
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.card,
                boxShadow: shadows.card,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingLeft: 20,
                paddingRight: 9,
              }}
            >
              <Icon name="search" size={22} color={colors.inkSoft} />
              <Txt variant="body" numberOfLines={1} style={{ flex: 1, fontSize: 16, lineHeight: 20 }}>
                {station ? station.name.toLowerCase() : "station, city or genre"}
              </Txt>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="close" size={18} />
              </View>
            </View>
          </Floating>

          <Floating delay={240} drift={7} style={{ left: 54, top: 110, right: 28 }}>
            <View
              style={{
                borderRadius: 22,
                backgroundColor: colors.card,
                boxShadow: shadows.card,
                paddingVertical: 6,
                paddingLeft: 10,
                paddingRight: 14,
                minHeight: 76,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              {station ? (
                <>
                  <StationArt station={station} size={52} radius={15} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Txt variant="bodyLg" numberOfLines={1}>
                      {station.name}
                    </Txt>
                    <Txt variant="meta" color={colors.inkSoft} numberOfLines={1}>
                      {stationSubtitle(station) || "Live radio"}
                    </Txt>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <LiveDot pulse />
                      <Txt variant="caption" color={colors.inkSoft}>
                        Live now
                      </Txt>
                    </View>
                  </View>
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
                    <Icon name="play_arrow" size={24} color={colors.onInk} filled />
                  </View>
                </>
              ) : (
                <>
                  <Skeleton width={52} height={52} radius={15} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="70%" height={13} radius={6} />
                    <Skeleton width="45%" height={11} radius={5} />
                  </View>
                </>
              )}
            </View>
          </Floating>

          <Floating delay={380} drift={4} style={{ left: 84, top: 224, right: 38 }}>
            <View
              style={{
                borderRadius: 26,
                backgroundColor: colors.ink,
                boxShadow: "0 30px 50px -24px rgba(16,17,20,0.5)",
                padding: 14,
                gap: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {station ? (
                  <StationArt station={station} size={56} radius={16} />
                ) : (
                  <Skeleton width={56} height={56} radius={16} onDark />
                )}
                <View style={{ flex: 1, gap: 6 }}>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.live,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      paddingHorizontal: 8,
                    }}
                  >
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.onInk }} />
                    <Txt
                      variant="tab"
                      color={colors.onInk}
                      style={{ fontFamily: fonts.sansSemibold, fontSize: 11, letterSpacing: 0.66 }}
                    >
                      LIVE
                    </Txt>
                  </View>
                  <Txt variant="bodyMedium" color={colors.onInk} numberOfLines={1}>
                    {station ? station.name : "Live radio"}
                  </Txt>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="pause" size={24} filled />
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <EqBars size={16} color="#B8BCC8" />
                <Txt variant="caption" color="#B8BCC8" numberOfLines={1} style={{ flexShrink: 1 }}>
                  Keeps playing with your phone locked
                </Txt>
              </View>
            </View>
          </Floating>

          <Floating delay={520} drift={3} style={{ left: 40, top: 372, flexDirection: "row" }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Nearby", icon: true, dark: false },
                { label: genre || "Jazz", icon: false, dark: true },
                { label: station?.country ?? "Anywhere", icon: false, dark: false },
              ].map((chip) => (
                <View
                  key={chip.label}
                  style={{
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: chip.dark ? colors.ink : colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingLeft: chip.icon ? 11 : 14,
                    paddingRight: 14,
                    maxWidth: 150,
                  }}
                >
                  {chip.icon ? <Icon name="near_me" size={17} /> : null}
                  <Txt variant="label" color={chip.dark ? colors.onInk : colors.ink} numberOfLines={1}>
                    {chip.label}
                  </Txt>
                </View>
              ))}
            </View>
          </Floating>
        </View>

        <Rise index={4} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LogoMark />
          <Txt variant="section" style={{ fontFamily: fonts.sansSemibold, letterSpacing: 0 }}>
            Aircircle
          </Txt>
        </Rise>

        <Rise index={5} style={{ marginTop: 16 }}>
          <Txt
            accessibilityRole="header"
            style={{ fontFamily: fonts.sansMedium, fontSize: 34, lineHeight: 38, letterSpacing: -0.68, color: colors.ink }}
          >
            Find live radio.
          </Txt>
          <Txt
            style={{
              fontFamily: fonts.serifItalic,
              fontSize: 42,
              lineHeight: 44,
              letterSpacing: -0.42,
              color: colors.ink,
              marginTop: 2,
            }}
          >
            Keep listening.
          </Txt>
        </Rise>

        <Rise index={6}>
          <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 12, fontSize: 16, lineHeight: 23 }}>
            Search stations, start listening, and keep your favorites close.
          </Txt>
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={16} color={colors.inkFaint} />
            <Txt variant="caption" color={colors.inkFaint} style={{ flex: 1 }}>
              Internet connection required. No account needed.
            </Txt>
          </View>
        </Rise>

        <Rise
          index={7}
          style={{ flexDirection: "row", gap: 10, marginTop: 22, marginBottom: insets.bottom + 10 }}
        >
          <Button label="Skip intro" variant="outline" onPress={() => finishOnboarding(router)} />
          <Button
            label="Explore live radio"
            icon="arrow_forward"
            grow
            onPress={() => router.push("/onboarding/welcome")}
          />
        </Rise>
      </View>
    </Screen>
  );
}
