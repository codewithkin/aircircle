import { View } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Txt } from "@/components/ui/txt";
import { colors } from "@/theme/tokens";

type SectionHeaderProps = {
  title: string;
  /** A quieter line under the title. */
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Larger title, used for the first section a new listener sees. */
  large?: boolean;
};

export function SectionHeader({ title, subtitle, actionLabel, onAction, large }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Txt
          variant={large ? "titleSm" : "section"}
          accessibilityRole="header"
          style={large ? { fontSize: 20, lineHeight: 23, letterSpacing: -0.4 } : undefined}
        >
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={colors.inkSoft}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {actionLabel ? (
        <PressableScale
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${title}`}
        >
          <Txt variant="label" color={colors.inkSoft}>
            {actionLabel}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Small-caps label above a group: "STATIONS", "ON THIS DEVICE". */
export function Eyebrow({ children, color = colors.inkFaint }: { children: string; color?: string }) {
  return (
    <Txt variant="eyebrow" color={color} accessibilityRole="header">
      {children}
    </Txt>
  );
}
