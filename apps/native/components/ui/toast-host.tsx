import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { usePresence } from "@/hooks/use-presence";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useToast } from "@/stores/toast";
import type { Toast } from "@/stores/toast";
import { springs } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";

/**
 * Draws the current toast. Mounted once at the root, above every screen, and
 * floats clear of the tab bar and mini player.
 */
export function ToastHost() {
  const toast = useToast((s) => s.toast);
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // Hold on to the last toast so it still has content while it animates out.
  const [shown, setShown] = useState<Toast | null>(toast);
  useEffect(() => {
    if (toast) setShown(toast);
  }, [toast]);

  const visible = toast !== null;
  const mounted = usePresence(visible);
  if (!mounted || !shown) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + 170,
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <MotiView
        key={shown.id}
        from={{ opacity: 0, translateY: reduced ? 0 : 16, scale: reduced ? 1 : 0.96 }}
        animate={{
          opacity: visible ? 1 : 0,
          translateY: visible || reduced ? 0 : 10,
          scale: 1,
        }}
        transition={springs.settle}
        accessibilityLiveRegion="polite"
        style={{
          minHeight: 48,
          maxWidth: "100%",
          borderRadius: 24,
          backgroundColor: colors.ink,
          boxShadow: shadows.lifted,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingLeft: shown.icon ? 14 : 18,
          paddingRight: shown.actionLabel ? 6 : 18,
        }}
      >
        {shown.icon ? <Icon name={shown.icon} size={18} color={colors.onInk} filled /> : null}
        <Txt variant="label" color={colors.onInk} numberOfLines={1} style={{ flexShrink: 1 }}>
          {shown.message}
        </Txt>
        {shown.actionLabel ? (
          <PressableScale
            onPress={() => {
              shown.onAction?.();
              hide();
            }}
            haptic="confirm"
            accessibilityRole="button"
            accessibilityLabel={shown.actionLabel}
            style={{
              height: 36,
              borderRadius: 18,
              paddingHorizontal: 14,
              backgroundColor: "rgba(255,255,255,0.14)",
              justifyContent: "center",
            }}
          >
            <Txt variant="label" color={colors.onInk}>
              {shown.actionLabel}
            </Txt>
          </PressableScale>
        ) : null}
      </MotiView>
    </View>
  );
}
