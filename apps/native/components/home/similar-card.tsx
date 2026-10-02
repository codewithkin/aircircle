import { useRouter } from "expo-router";
import { View } from "react-native";

import { StationArt } from "@/components/station/station-art";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { stationGenres } from "@/lib/station";
import type { Station } from "@/lib/types";
import { colors } from "@/theme/tokens";

/**
 * "Find another station like this" — the one next step offered under the last
 * station: more of the same genre from the same country.
 */
export function SimilarCard({ station }: { station: Station }) {
  const router = useRouter();
  const tag = station.tags?.split(",")[0]?.trim();
  const genre = stationGenres(station, 1);

  // Nothing to be "like" without a genre or a place.
  if (!tag && !station.country) return null;

  const detail = [genre ? `More ${genre.toLowerCase()}` : "More stations", station.country ? `from ${station.country}` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <PressableScale
      onPress={() =>
        router.push({
          pathname: "/stations",
          params: {
            title: genre || station.country || "Stations",
            ...(tag ? { tag } : {}),
            ...(station.country ? { country: station.country } : {}),
            ...(station.countryCode ? { code: station.countryCode } : {}),
          },
        })
      }
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`Find another station like this. ${detail}`}
    >
      <Gradient
        colors={["#CDEEFC", "#EAEDFF"]}
        angle={120}
        style={{
          borderRadius: 24,
          paddingVertical: 16,
          paddingLeft: 18,
          paddingRight: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {["similar-a", "similar-b", "similar-c"].map((id, i) => (
            <View
              key={id}
              style={{
                marginLeft: i === 0 ? 0 : -10,
                borderRadius: 21,
                borderWidth: 3,
                borderColor: "#EEF2F8",
              }}
            >
              <StationArt
                station={{ stationuuid: `${station.stationuuid}-${id}`, name: "" }}
                size={36}
                radius={18}
              />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="bodyLg">Find another station like this</Txt>
          <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
            {detail}
          </Txt>
        </View>
        <Icon name="arrow_forward" size={22} />
      </Gradient>
    </PressableScale>
  );
}
