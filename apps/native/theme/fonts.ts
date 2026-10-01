import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";

/**
 * Every font file the app draws with, keyed by the family name used in
 * `theme/tokens.ts`. Loaded once before the first screen renders.
 */
export const fontAssets = {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  JetBrainsMono_500Medium,
  MaterialSymbolsRounded: require("../assets/fonts/MaterialSymbolsRounded.ttf"),
  MaterialSymbolsRoundedFilled: require("../assets/fonts/MaterialSymbolsRoundedFilled.ttf"),
};
