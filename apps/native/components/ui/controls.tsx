import { MotiView } from "moti";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Txt } from "@/components/ui/txt";
import { haptics } from "@/lib/haptics";
import { springs, timing } from "@/theme/motion";
import { colors, shadows } from "@/theme/tokens";

type SegmentedProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** 46 for a full-width tab strip, 40 for a compact inline control. */
  height?: number;
  /** Segments share the width equally. Off lets each hug its label. */
  equal?: boolean;
  accessibilityLabel?: string;
};

/**
 * A segmented control whose white thumb slides between options rather than
 * jumping, so a change of mode reads as one continuous move.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  height = 46,
  equal = true,
  accessibilityLabel,
}: SegmentedProps<T>) {
  // Measured positions of each segment, so the thumb knows where to go.
  const [frames, setFrames] = useState<Record<string, { x: number; width: number }>>({});
  const frame = frames[value];
  const inner = height - 8;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.chip,
        padding: 4,
        flexDirection: "row",
      }}
    >
      {frame ? (
        <MotiView
          animate={{ translateX: frame.x, width: frame.width }}
          transition={springs.settle}
          style={{
            position: "absolute",
            top: 4,
            left: 0,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: colors.card,
            boxShadow: "0 1px 2px rgba(16,17,20,0.08)",
          }}
        />
      ) : null}

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (selected) return;
              haptics.tap();
              onChange(option.value);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setFrames((prev) =>
                prev[option.value]?.x === x && prev[option.value]?.width === width
                  ? prev
                  : { ...prev, [option.value]: { x, width } },
              );
            }}
            style={{
              flex: equal ? 1 : undefined,
              paddingHorizontal: equal ? 0 : 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt
              variant={height >= 46 ? "label" : "captionMedium"}
              color={selected ? colors.ink : colors.inkSoft}
              numberOfLines={1}
            >
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
};

/** An on/off switch. Applies the moment it's tapped — there is no Save. */
export function Toggle({ value, onChange, accessibilityLabel }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onChange(!value);
      }}
    >
      <MotiView
        animate={{ backgroundColor: value ? colors.ink : "#D5D8DE" }}
        transition={timing.base}
        style={{ width: 52, height: 32, borderRadius: 16, padding: 4 }}
      >
        <MotiView
          animate={{ translateX: value ? 20 : 0 }}
          transition={springs.press}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.card,
            boxShadow: shadows.hairline,
          }}
        />
      </MotiView>
    </Pressable>
  );
}
