import * as Haptics from "expo-haptics";

import { useSettings } from "@/stores/settings";

/**
 * Haptic feedback, gated on the listener's setting. Never the only signal for
 * anything — every haptic here accompanies a visible change.
 */
function enabled(): boolean {
  return useSettings.getState().hapticsEnabled;
}

export const haptics = {
  /** A control was touched: chips, tabs, rows. */
  tap: () => {
    if (enabled()) void Haptics.selectionAsync().catch(() => {});
  },
  /** Something was committed: Play, Favorite, a timer set. */
  confirm: () => {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** A threshold was crossed or something lifted: drag-to-stop, long-press. */
  lift: () => {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success: () => {
    if (enabled()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  },
  warning: () => {
    if (enabled()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  },
};
