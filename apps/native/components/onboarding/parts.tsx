import { MotiView } from "moti";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";
import { springs, timing } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";
import { t } from "@/lib/i18n";

type OnboardingHeaderProps = {
  onBack?: () => void;
  /** 1 or 2 — which of the two question steps this is. Omit for no progress. */
  step?: 1 | 2;
  skipLabel?: string;
  onSkip?: () => void;
  onDark?: boolean;
};

/** Back, progress, and a way out — on every onboarding screen. */
export function OnboardingHeader({ onBack, step, skipLabel, onSkip, onDark }: OnboardingHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        height: insets.top + 60,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
      }}
    >
      <View style={{ flex: 1, alignItems: "flex-start" }}>
        {onBack ? (
          <IconButton
            icon="arrow_back"
            color={onDark ? colors.onInk : colors.ink}
            accessibilityLabel={t("Back")}
            onPress={onBack}
          />
        ) : null}
      </View>

      {step ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("Step {{step}} of 2", { step })}
          style={{ flexDirection: "row", gap: 6 }}
        >
          {[1, 2].map((n) => (
            <MotiView
              key={n}
              animate={{ width: n <= step ? 28 : 14, backgroundColor: n <= step ? colors.ink : "#D5D8DE" }}
              transition={springs.settle}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </View>
      ) : null}

      <View style={{ flex: 1, alignItems: "flex-end" }}>
        {skipLabel ? (
          <PressableScale
            onPress={onSkip}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={skipLabel}
            style={{ paddingHorizontal: 12, height: 44, justifyContent: "center" }}
          >
            <Txt variant="bodyMedium" color={onDark ? "#B8BCC8" : colors.inkSoft}>
              {skipLabel}
            </Txt>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

type OptionRowProps = {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * A multi-select answer. Selecting fills the row with ink and pops a check in;
 * the row is operable with a plain tap and announces its selected state.
 */
export function OptionRow({ icon, label, selected, onPress }: OptionRowProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <MotiView
        animate={{
          backgroundColor: selected ? colors.ink : colors.card,
          scale: pressed && !reduced ? 0.98 : 1,
        }}
        transition={{ backgroundColor: timing.base, scale: springs.press }}
        style={{
          minHeight: 62,
          borderRadius: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 10,
          boxShadow: selected ? undefined : shadows.card,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: selected ? "rgba(255,255,255,0.12)" : colors.chip,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={20} color={selected ? colors.onInk : colors.ink} />
        </View>
        <Txt variant="bodyMedium" color={selected ? colors.onInk : colors.ink} style={{ flex: 1, lineHeight: 19.5 }}>
          {label}
        </Txt>
        {selected ? (
          <MotiView from={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop}>
            <Icon name="check_circle" size={22} color={colors.onInk} filled />
          </MotiView>
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#C9CCD4" }} />
        )}
      </MotiView>
    </Pressable>
  );
}

type PlaceCardProps = {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  leading: ReactNode;
};

/** A selectable place in the "what should we put within reach" step. */
export function PlaceCard({ title, subtitle, selected, onPress, leading }: PlaceCardProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${subtitle}`}
      style={{ flex: 1 }}
    >
      <MotiView
        animate={{
          backgroundColor: selected ? colors.ink : colors.card,
          scale: pressed && !reduced ? 0.97 : 1,
        }}
        transition={{ backgroundColor: timing.base, scale: springs.press }}
        style={{
          minHeight: 108,
          borderRadius: 20,
          padding: 14,
          justifyContent: "space-between",
          gap: 14,
          boxShadow: selected ? undefined : shadows.card,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", minHeight: 22 }}>
          {leading}
          {selected ? (
            <MotiView from={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop}>
              <Icon name="check_circle" size={20} color={colors.onInk} filled />
            </MotiView>
          ) : null}
        </View>
        <View style={{ gap: 4 }}>
          <Txt variant="bodyMedium" color={selected ? colors.onInk : colors.ink} numberOfLines={1}>
            {title}
          </Txt>
          <Txt variant="tab" color={selected ? "#B8BCC8" : colors.inkSoft} numberOfLines={1} style={{ fontSize: 12 }}>
            {subtitle}
          </Txt>
        </View>
      </MotiView>
    </Pressable>
  );
}
