import { Text } from "react-native";
import type { TextProps } from "react-native";

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
  return <Text {...props} style={[typeScale[variant], { color }, style]} />;
}
