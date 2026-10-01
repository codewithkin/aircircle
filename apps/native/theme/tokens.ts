import type { TextStyle, ViewStyle } from "react-native";

/**
 * Soft Air design tokens, for anything that can't take a class name:
 * gradients, shadows, animated colours, icon tints.
 *
 * The same values are declared as Tailwind theme variables in `global.css`.
 * Change both together.
 */

export const colors = {
  canvas: "#F5F6F8",
  card: "#FFFFFF",
  chip: "#E9EBEF",
  hairline: "#E3E5EA",

  ink: "#101114",
  inkSoft: "#6B7080",
  inkFaint: "#8B90A0",
  onInk: "#FFFFFF",

  signal: "#006EB3",
  signalDeep: "#004E95",
  signalSoft: "#DDF2FF",
  signalLine: "#9ECAEF",

  live: "#E64343",
  alert: "#B32228",
  alertStrong: "#D33A3C",
  alertSoft: "#FFE7E4",
  alertCanvas: "#FEF4F4",

  amber: "#975800",
  amberStrong: "#F2AF48",
  amberSoft: "#FFECCD",
  amberCanvas: "#FBF4EA",

  ok: "#1C985A",
  okDeep: "#095C34",
  okSoft: "#DAF7E3",

  night: "#0E1424",
  nightOffline: "#15181F",
  nightAccent: "#90CDF1",
  nightText: "#9BA1B0",
  nightFaint: "#7D8494",
} as const;

export const fonts = {
  sans: "InstrumentSans_400Regular",
  sansMedium: "InstrumentSans_500Medium",
  sansSemibold: "InstrumentSans_600SemiBold",
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  mono: "JetBrainsMono_500Medium",
  icon: "MaterialSymbolsRounded",
  iconFilled: "MaterialSymbolsRoundedFilled",
} as const;

export const radii = {
  chip: 19,
  row: 15,
  card: 22,
  tile: 24,
  hero: 28,
  art: 36,
} as const;

/** Horizontal page gutter used by every screen. */
export const GUTTER = 24;

/**
 * The type scale, as it appears in the designs. `letterSpacing` is in points:
 * the designs give it in em, so each value here is already multiplied out by
 * its font size.
 */
export const type = {
  /** Editorial serif for full-screen states: "You're offline." */
  display: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 47, letterSpacing: -0.46 },
  displaySm: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 41, letterSpacing: -0.4 },

  /** Screen titles. */
  titleLg: { fontFamily: fonts.sansMedium, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontFamily: fonts.sansMedium, fontSize: 26, lineHeight: 29, letterSpacing: -0.52 },
  titleSm: { fontFamily: fonts.sansMedium, fontSize: 24, lineHeight: 27, letterSpacing: -0.48 },

  /** Section headings and card titles. */
  heading: { fontFamily: fonts.sansMedium, fontSize: 18, lineHeight: 22.5 },
  section: { fontFamily: fonts.sansMedium, fontSize: 17, lineHeight: 19, letterSpacing: -0.34 },

  /** Rows, buttons, body. */
  bodyLg: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 19 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21.75 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 18 },
  label: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 17 },
  meta: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 17 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 16 },
  captionMedium: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 16 },
  tab: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 14 },

  /** Small caps labels: "LIVE NOW · FOR YOU". */
  eyebrow: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.96,
    textTransform: "uppercase",
  },

  /** Station name set inside its tile; size scales with the tile. */
  tile: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 16.7, letterSpacing: -0.43 },

  /** The sleep timer countdown. */
  timer: { fontFamily: fonts.sans, fontSize: 68, lineHeight: 70, letterSpacing: -2.04 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/**
 * Elevation. The designs use soft, wide, downward shadows that iOS can draw
 * exactly; Android only has `elevation`, so each level carries both.
 */
export const shadows = {
  /** Barely there — small white controls on the canvas. */
  hairline: {
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  /** White cards resting on the canvas. */
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  /** Floating surfaces: the mini player, sheets. */
  floating: {
    shadowColor: colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  /** The blue glow under the search field. */
  signal: {
    shadowColor: "#28468C",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const satisfies Record<string, ViewStyle>;
