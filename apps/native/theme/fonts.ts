/**
 * Every font file the app draws with, keyed by the family name used in
 * `theme/tokens.ts`. Loaded once before the first screen renders.
 *
 * Each file is required by path rather than imported from its package's
 * index: the index pulls in every weight and style, and all of them would end
 * up in the app bundle.
 */
export const fontAssets = {
  InstrumentSans_400Regular: require("@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf"),
  InstrumentSans_500Medium: require("@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf"),
  InstrumentSans_600SemiBold: require("@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf"),
  InstrumentSerif_400Regular: require("@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf"),
  InstrumentSerif_400Regular_Italic: require("@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"),
  JetBrainsMono_500Medium: require("@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf"),
  MaterialSymbolsRounded: require("../assets/fonts/MaterialSymbolsRounded.ttf"),
  MaterialSymbolsRoundedFilled: require("../assets/fonts/MaterialSymbolsRoundedFilled.ttf"),
};
