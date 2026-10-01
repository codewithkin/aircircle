import { Stack } from "expo-router";

import { colors } from "@/theme/tokens";

/**
 * First launch only. Short, skippable at every step, and never asks for an
 * account or a permission before explaining what it's for.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: colors.night } }} />
      <Stack.Screen name="intent" />
      <Stack.Screen name="taste" />
      <Stack.Screen name="ready" options={{ animation: "fade" }} />
    </Stack>
  );
}
