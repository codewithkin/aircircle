import { View } from "react-native";

import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { colors, shadows } from "@/theme/tokens";

type SearchFieldProps = {
  onPress: () => void;
  onNearbyPress: () => void;
};

/**
 * Home's search entry — the largest target on the screen. It looks like a
 * field but is a button: tapping it moves to Search with the keyboard up.
 */
export function SearchField({ onPress, onNearbyPress }: SearchFieldProps) {
  return (
    // The gradient is the border: a white pill sits 1.5pt inside it.
    <Gradient
      colors={["#71C1F7", "#C6B1F0", "#FFC48A"]}
      locations={[0, 0.55, 1]}
      angle={115}
      style={{ height: 62, borderRadius: 31, padding: 1.5, boxShadow: shadows.signal }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 30,
          backgroundColor: colors.card,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 7.5,
          gap: 12,
        }}
      >
        <PressableScale
          onPress={onPress}
          pressedScale={0.985}
          accessibilityRole="search"
          accessibilityLabel="Search live radio"
          accessibilityHint="Search by station, city or genre."
          containerStyle={{ flex: 1 }}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <Gradient
            colors={["#7ACAE9", colors.signal]}
            angle={160}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="search" size={22} color={colors.onInk} />
          </Gradient>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt variant="bodyLg">Search live radio</Txt>
            <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
              Try “BBC World Service” or “jazz”
            </Txt>
          </View>
        </PressableScale>

        <View style={{ width: 1, height: 28, backgroundColor: colors.hairline }} />

        <PressableScale
          onPress={onNearbyPress}
          pressedScale={0.9}
          accessibilityRole="button"
          accessibilityLabel="Stations near me"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.signalSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="near_me" size={20} color={colors.signal} filled />
        </PressableScale>
      </View>
    </Gradient>
  );
}
