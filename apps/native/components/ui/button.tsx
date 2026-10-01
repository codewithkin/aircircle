import type { StyleProp, ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { colors, shadows } from "@/theme/tokens";

export type ButtonVariant =
  /** The one primary action on a screen. */
  | "ink"
  /** Secondary, on the light canvas. */
  | "outline"
  /** A white pill resting on the canvas. */
  | "card"
  /** Search and selection. */
  | "signal"
  /** Retry on a failed station. */
  | "alert"
  | "alertOutline"
  /** Retry while reconnecting. */
  | "amber"
  | "amberOutline"
  /** Primary and secondary on dark screens. */
  | "night"
  | "nightOutline"
  | "white"
  /** Text only. */
  | "ghost";

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string; shadow?: string }> =
  {
    ink: { bg: colors.ink, fg: colors.onInk },
    outline: { bg: "transparent", fg: colors.ink, border: "#D5D8DE" },
    card: { bg: colors.card, fg: colors.ink, shadow: shadows.card },
    signal: { bg: colors.signal, fg: colors.onInk },
    alert: { bg: colors.alertStrong, fg: colors.onInk },
    alertOutline: { bg: "transparent", fg: "#AC1922", border: "#EDAAA4" },
    amber: { bg: colors.amberStrong, fg: colors.ink },
    amberOutline: { bg: "transparent", fg: colors.ink, border: "#CFBAA3" },
    night: { bg: colors.nightAccent, fg: colors.ink },
    nightOutline: { bg: "transparent", fg: colors.onInk, border: "rgba(255,255,255,0.25)" },
    white: { bg: colors.card, fg: colors.ink },
    ghost: { bg: "transparent", fg: colors.inkSoft },
  };

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconFilled?: boolean;
  /** 56 for the main action at the bottom of a screen, 52 inline, 44–46 compact. */
  height?: number;
  /** Stretch to fill the row. */
  grow?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "ink",
  icon,
  iconFilled,
  height = 56,
  grow = false,
  disabled,
  accessibilityLabel,
  containerStyle,
}: ButtonProps) {
  const v = VARIANTS[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="confirm"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      containerStyle={[grow ? { flex: 1 } : null, containerStyle]}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: v.bg,
        borderWidth: v.border ? 1.5 : 0,
        borderColor: v.border,
        boxShadow: v.shadow,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingLeft: icon ? 16 : 24,
        paddingRight: icon ? 22 : 24,
      }}
    >
      {icon ? <Icon name={icon} size={22} color={v.fg} filled={iconFilled} /> : null}
      <Txt variant="bodyLg" color={v.fg} numberOfLines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  color?: string;
  /** Background behind the icon; transparent by default. */
  background?: string;
  filled?: boolean;
  shadow?: boolean;
  disabled?: boolean;
};

/** A round icon control. Always at least 44pt so it stays easy to hit. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 48,
  iconSize = 24,
  color = colors.ink,
  background = "transparent",
  filled,
  shadow,
  disabled,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        boxShadow: shadow ? shadows.hairline : undefined,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={iconSize} color={color} filled={filled} />
    </PressableScale>
  );
}
