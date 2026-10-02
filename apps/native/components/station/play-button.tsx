import { MotiView } from "moti";

import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { playFeedback } from "@/lib/sounds";
import { springs } from "@/theme/motion";
import { colors } from "@/theme/tokens";

export type PlayButtonState = "play" | "pause" | "loading";

type PlayButtonProps = {
  state: PlayButtonState;
  onPress?: () => void;
  size?: number;
  background?: string;
  color?: string;
  shadow?: string;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * The round Play/Pause control. Its size never changes between states, so
 * nothing around it moves when playback starts, pauses or is connecting — the
 * glyph swaps in place.
 */
export function PlayButton({
  state,
  onPress,
  size = 48,
  background = colors.ink,
  color = colors.onInk,
  shadow,
  accessibilityLabel,
  disabled,
}: PlayButtonProps) {
  const reduced = useReducedMotion();
  const iconSize = Math.round(size * 0.54);

  return (
    <PressableScale
      onPress={() => {
        // The sound confirms the tap itself, so it follows what was pressed.
        if (state === "play") playFeedback("play");
        else if (state === "pause") playFeedback("pause");
        onPress?.();
      }}
      disabled={disabled}
      haptic="confirm"
      pressedScale={0.92}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: state === "loading" }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        boxShadow: shadow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {state === "loading" ? (
        <MotiView
          key="loading"
          from={{ rotate: "0deg", opacity: 0 }}
          animate={{ rotate: reduced ? "0deg" : "360deg", opacity: 1 }}
          transition={{
            rotate: { type: "timing", duration: 900, loop: !reduced, repeatReverse: false },
            opacity: { type: "timing", duration: 160 },
          }}
        >
          <Icon name="progress_activity" size={iconSize} color={color} />
        </MotiView>
      ) : (
        // Keyed by glyph so each one pops in as the other leaves.
        <MotiView
          key={state}
          from={{ scale: reduced ? 1 : 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.pop}
        >
          <Icon name={state === "pause" ? "pause" : "play_arrow"} size={iconSize} color={color} filled />
        </MotiView>
      )}
    </PressableScale>
  );
}
