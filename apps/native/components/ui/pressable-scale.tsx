import { MotiView } from "moti";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";
import { springs } from "@/theme/motion";

type PressableScaleProps = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  /** Applied to the animated surface — give it the visual styling. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the touch target — give it layout in the parent (flex, margin). */
  containerStyle?: StyleProp<ViewStyle>;
  /** How far it shrinks under the finger. Smaller surfaces can shrink more. */
  pressedScale?: number;
  /** Which haptic accompanies the press, if any. */
  haptic?: "tap" | "confirm" | "none";
};

/**
 * The app's touch response: every tappable surface dips under the finger and
 * springs back. Feedback starts on touch-down, so a tap is acknowledged before
 * whatever it triggers has had time to happen.
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  pressedScale = 0.97,
  haptic = "tap",
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={containerStyle}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic !== "none") haptics[haptic]();
        onPress?.(e);
      }}
    >
      <MotiView
        animate={{
          scale: pressed && !reduced ? pressedScale : 1,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        }}
        transition={springs.press}
        style={style}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}
