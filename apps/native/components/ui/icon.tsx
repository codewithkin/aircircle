import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

import { ICON_GLYPHS } from "@/theme/icon-glyphs";
import type { IconName } from "@/theme/icon-glyphs";
import { colors, fonts } from "@/theme/tokens";

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** The solid variant — used for the active tab, Play/Pause, a saved heart. */
  filled?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * A Material Symbols Rounded icon. Decorative by default: the control that
 * holds it carries the accessible label.
 */
export function Icon({ name, size = 24, color = colors.ink, filled = false, style }: IconProps) {
  return (
    <Text
      allowFontScaling={false}
      accessible={false}
      importantForAccessibility="no"
      style={[
        {
          fontFamily: filled ? fonts.iconFilled : fonts.icon,
          fontSize: size,
          lineHeight: size,
          width: size,
          height: size,
          color,
          textAlign: "center",
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {String.fromCodePoint(ICON_GLYPHS[name])}
    </Text>
  );
}

export type { IconName };
