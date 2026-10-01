import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { colors } from "@/theme/tokens";

export type ActionTone = "signal" | "ok" | "violet" | "amber" | "neutral";

const TONES: Record<ActionTone, { bg: string; fg: string }> = {
  signal: { bg: colors.signalSoft, fg: colors.signal },
  ok: { bg: colors.okSoft, fg: "#007E46" },
  violet: { bg: "#EEECFF", fg: "#644FB1" },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  neutral: { bg: colors.chip, fg: colors.ink },
};

type ActionRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  tone?: ActionTone;
  onPress: () => void;
  /** Draw the hairline under the row. Off for the last row in a card. */
  divider?: boolean;
};

/** A full-width "next step" row: easy to hit with a thumb, one line of why. */
export function ActionRow({
  icon,
  title,
  subtitle,
  tone = "signal",
  onPress,
  divider = true,
}: ActionRowProps) {
  const t = TONES[tone];

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{
        minHeight: 68,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.hairline,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: t.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={22} color={t.fg} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant="bodyLg">{title}</Txt>
        {subtitle ? (
          <Txt variant="caption" color={colors.inkSoft} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <Icon name="chevron_right" size={22} color={colors.inkFaint} />
    </PressableScale>
  );
}
