import { Text, View } from "react-native";

type FlagProps = {
  /** ISO 3166-1 alpha-2, e.g. "PT". Renders nothing when missing or invalid. */
  code?: string | null;
  /** Height of the flag in points; width follows at roughly 10:7. */
  size?: number;
};

/**
 * A country flag, drawn with the platform's own flag emoji so every country
 * the directory lists is covered without shipping image assets.
 */
export function Flag({ code, size = 14 }: FlagProps) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return null;

  const emoji = String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ height: size, justifyContent: "center" }}
    >
      <Text allowFontScaling={false} style={{ fontSize: size, lineHeight: size * 1.25 }}>
        {emoji}
      </Text>
    </View>
  );
}
