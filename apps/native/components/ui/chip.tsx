import { MotiView } from "moti";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";
import { springs, timing } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";

type ChipProps = {
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  /** Grey on the canvas by default; white for chips that sit on a tinted area. */
  tone?: "chip" | "card" | "signal";
  icon?: IconName;
  /** Custom leading content, e.g. a flag. Takes the place of `icon`. */
  leading?: ReactNode;
  trailingIcon?: IconName;
  accessibilityLabel?: string;
};

/**
 * A pill for filters, shortcuts and multi-select answers. Selection is a
 * colour change that eases in, so toggling several in a row reads as calm
 * rather than flickery.
 */
export function Chip({
  label,
  onPress,
  onLongPress,
  selected = false,
  tone = "chip",
  icon,
  leading,
  trailingIcon,
  accessibilityLabel,
}: ChipProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();

  const background = selected
    ? tone === "signal"
      ? colors.signalSoft
      : colors.ink
    : tone === "chip"
      ? colors.chip
      : colors.card;
  const foreground = selected ? (tone === "signal" ? colors.signalDeep : colors.onInk) : colors.ink;
  const hasLeading = !!icon || !!leading;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
    >
      <MotiView
        animate={{ backgroundColor: background, scale: pressed && !reduced ? 0.95 : 1 }}
        transition={{ backgroundColor: timing.base, scale: springs.press }}
        style={{
          height: 38,
          borderRadius: 19,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingLeft: hasLeading ? 11 : 14,
          paddingRight: trailingIcon ? 10 : 14,
          borderWidth: selected && tone === "signal" ? 1.5 : 0,
          borderColor: colors.signalLine,
          boxShadow: !selected && tone === "card" ? shadows.hairline : undefined,
        }}
      >
        {leading ?? (icon ? <Icon name={icon} size={17} color={foreground} /> : null)}
        <Txt variant="label" color={foreground} numberOfLines={1}>
          {label}
        </Txt>
        {trailingIcon ? <Icon name={trailingIcon} size={18} color={foreground} /> : null}
      </MotiView>
    </Pressable>
  );
}
