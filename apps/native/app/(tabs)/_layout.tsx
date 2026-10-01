import { Tabs } from "expo-router";

import { TabBar } from "@/components/player/tab-bar";
import { colors } from "@/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
        // Tabs cross-fade rather than cut, so switching feels like one surface.
        animation: "fade",
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
