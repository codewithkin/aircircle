import { MotiView } from "moti";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { usePresence } from "@/hooks/use-presence";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { springs, timing } from "@/theme/motion";
import { colors } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Announced to screen readers when the sheet opens. */
  accessibilityLabel?: string;
};

/** Dragging the sheet down past this distance, or flicking it, dismisses it. */
const DISMISS_DISTANCE = 110;

/**
 * A bottom sheet. Whatever is behind it — including playback — carries on
 * untouched; dismissing it returns to exactly the state it opened over.
 *
 * Closes by dragging down, tapping the dimmed area, or the system back button.
 */
export function Sheet({ visible, onClose, children, accessibilityLabel }: SheetProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const mounted = usePresence(visible, 320);
  const dragY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dragY.value > DISMISS_DISTANCE || e.velocityY > 900) scheduleOnRN(onClose);
      dragY.value = withSpring(0, { damping: 24, stiffness: 260 });
    });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={timing.base}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(16,17,20,0.42)" }]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
          />
        </MotiView>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <MotiView
            from={{ translateY: reduced ? 0 : 480, opacity: reduced ? 0 : 1 }}
            animate={{
              translateY: visible || reduced ? 0 : 480,
              opacity: visible || !reduced ? 1 : 0,
            }}
            transition={springs.settle}
          >
            <Animated.View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel}
              style={[
                {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  paddingHorizontal: 24,
                  paddingBottom: insets.bottom + 8,
                },
                dragStyle,
              ]}
            >
              {/* The handle is the drag target, so content inside can still scroll and be tapped. */}
              <GestureDetector gesture={pan}>
                <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 22 }}>
                  <View
                    style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#D5D8DE" }}
                  />
                </View>
              </GestureDetector>
              {children}
            </Animated.View>
          </MotiView>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
