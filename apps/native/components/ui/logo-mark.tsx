import { View } from "react-native";

import { colors } from "@/theme/tokens";

type LogoMarkProps = {
  size?: number;
  /** Light mark for dark surfaces. */
  inverted?: boolean;
};

/** The Aircircle mark: a ring inside a disc. */
export function LogoMark({ size = 34, inverted = false }: LogoMarkProps) {
  const ring = size * 0.47;

  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: inverted ? colors.onInk : colors.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: size * 0.074,
          borderColor: inverted ? colors.ink : colors.canvas,
        }}
      />
    </View>
  );
}
