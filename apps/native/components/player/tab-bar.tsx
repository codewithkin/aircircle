import type { Tabs } from "expo-router";
import { MotiView } from "moti";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "@/components/player/mini-player";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";
import { useNetwork } from "@/stores/network";
import { springs, timing } from "@/theme/motion";
import { colors, fonts } from "@/theme/tokens";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: "Home", icon: "home" },
  search: { label: "Search", icon: "search" },
  favorites: { label: "Favorites", icon: "favorite" },
  settings: { label: "Settings", icon: "settings" },
};

/**
 * The bottom of the app: the mini player, then the four tabs. The active tab
 * is marked three ways — filled icon, darker colour, heavier label — so it
 * never depends on colour alone.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const isConnected = useNetwork((s) => s.isConnected);

  // Home turns dark when the device is offline; the bar follows it.
  const dark = !isConnected && state.routes[state.index]?.name === "index";
  const active = dark ? colors.onInk : colors.ink;
  const inactive = dark ? colors.nightFaint : colors.inkFaint;

  return (
    <MotiView
      animate={{ backgroundColor: dark ? colors.nightOffline : colors.canvas }}
      transition={timing.slow}
      style={{ paddingBottom: insets.bottom }}
    >
      {dark ? null : <MiniPlayer />}

      <View
        accessibilityRole="tablist"
        style={{
          height: 72,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  haptics.tap();
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={{ flex: 1, height: 64, alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <MotiView
                // The icon dips and springs back as its tab becomes active.
                key={focused ? "on" : "off"}
                from={{ scale: focused && !reduced ? 0.78 : 1 }}
                animate={{ scale: 1 }}
                transition={springs.pop}
              >
                <Icon name={tab.icon} size={24} color={focused ? active : inactive} filled={focused} />
              </MotiView>
              <Txt
                variant="tab"
                color={focused ? active : inactive}
                style={{ fontFamily: focused ? fonts.sansSemibold : fonts.sansMedium }}
              >
                {tab.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </MotiView>
  );
}
