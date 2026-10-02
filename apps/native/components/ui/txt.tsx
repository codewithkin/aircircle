import { Text } from "react-native";
import type { TextProps } from "react-native";

import { isRtlLanguage } from "@/lib/i18n";
import { colors, type as typeScale } from "@/theme/tokens";
import type { TypeVariant } from "@/theme/tokens";

type TxtProps = TextProps & {
  variant?: TypeVariant;
  color?: string;
};

/**
 * Text set in the Soft Air type scale. Every string in the app goes through
 * this so font family, size and tracking always come from the same table.
 */
export function Txt({ variant = "body", color = colors.ink, style, ...props }: TxtProps) {
  // The layout is never mirrored, but Arabic still has to run right-to-left
  // within its own line so punctuation and numbers land where they should.
  const direction = isRtlLanguage() ? ({ writingDirection: "rtl" } as const) : null;
  return <Text {...props} style={[typeScale[variant], { color }, direction, style]} />;
}
