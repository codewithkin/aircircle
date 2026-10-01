import { MotiView } from "moti";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ENTER_OFFSET, staggerDelay, timing } from "@/theme/motion";

type RiseProps = {
  children: ReactNode;
  /** Position in a staggered group; each step arrives a beat after the last. */
  index?: number;
  /** Extra wait before the stagger starts, in ms. */
  delay?: number;
  /** How far it travels. Larger for hero content, 0 for a plain fade. */
  offset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's one entrance: content rises a short way while fading in. Used for
 * every section on every screen, staggered top to bottom, so screens assemble
 * the same way everywhere.
 */
export function Rise({ children, index = 0, delay = 0, offset = ENTER_OFFSET, style }: RiseProps) {
  const reduced = useReducedMotion();

  return (
    <MotiView
      from={{ opacity: 0, translateY: reduced ? 0 : offset }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...timing.enter, delay: staggerDelay(index, delay) }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
