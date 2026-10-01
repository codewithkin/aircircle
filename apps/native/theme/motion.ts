import { Easing } from "react-native-reanimated";

/**
 * Motion for Soft Air: present, quick, and never in the way.
 *
 * Three rules the whole app follows:
 *   1. Things arrive by rising a short distance while fading in. Nothing
 *      bounces in from off-screen.
 *   2. Touch is answered with a spring, state changes with a timed ease.
 *   3. Anything that loops (the live dot, the equaliser) is small and slow.
 */

/** Decelerating ease — fast start, soft landing. Used for everything timed. */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

export const durations = {
  /** Colour and opacity changes on controls. */
  quick: 160,
  /** State swaps: play/pause icon, selection. */
  base: 240,
  /** Content entering the screen. */
  enter: 420,
  /** Full-screen state changes, like the canvas turning amber. */
  slow: 600,
} as const;

export const timing = {
  quick: { type: "timing", duration: durations.quick, easing: easeOut },
  base: { type: "timing", duration: durations.base, easing: easeOut },
  enter: { type: "timing", duration: durations.enter, easing: easeOut },
  slow: { type: "timing", duration: durations.slow, easing: easeOut },
} as const;

export const springs = {
  /** Press feedback: tight, no visible overshoot. */
  press: { type: "spring", damping: 22, stiffness: 420, mass: 0.6 },
  /** Small things popping: a heart, a check. A little life, then still. */
  pop: { type: "spring", damping: 12, stiffness: 320, mass: 0.6 },
  /** Surfaces sliding into place: the mini player, sheets, toasts. */
  settle: { type: "spring", damping: 26, stiffness: 260, mass: 0.9 },
} as const;

/** How far content rises as it enters. */
export const ENTER_OFFSET = 14;

/** Gap between consecutive items in a staggered entrance. */
export const STAGGER_MS = 55;

/**
 * Stagger is capped so a long list finishes arriving while the first rows are
 * still being read, instead of trickling in one by one.
 */
export const MAX_STAGGER_STEPS = 8;

export function staggerDelay(index: number, base = 0): number {
  return base + Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
}
