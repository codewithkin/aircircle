import { useReducedMotion as useSystemReducedMotion } from "react-native-reanimated";

import { useSettings } from "@/stores/settings";

/**
 * True when movement should be kept to a minimum: either the system
 * accessibility setting or the in-app "Reduce motion" switch. State changes
 * still fade; things just stop travelling and looping.
 */
export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const inApp = useSettings((s) => s.reduceMotion);
  return system || inApp;
}
