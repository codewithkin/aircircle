import { ScrollView, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Sheet } from "@/components/ui/sheet";
import { Txt } from "@/components/ui/txt";
import { changeLanguage, currentLanguage, t } from "@/lib/i18n";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/languages";
import type { LanguageCode } from "@/lib/i18n/languages";
import { refreshCarLibrary } from "@/lib/car-sync";
import { useSettings } from "@/stores/settings";
import { colors } from "@/theme/tokens";

type LanguageSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Picks the app's language. Each language is listed in its own name first, so
 * it can be found by someone who can't read the language the app is in now.
 *
 * Choosing one applies immediately: the screens are rebuilt in the new
 * language, and the choice is remembered on this device.
 */
export function LanguageSheet({ visible, onClose }: LanguageSheetProps) {
  const active = currentLanguage();

  const choose = async (code: LanguageCode) => {
    onClose();
    if (code === active) return;
    await changeLanguage(code);
    // Saving the setting is what makes the root rebuild every screen.
    useSettings.getState().update({ language: code });
    // The car's folder names follow the app's language too.
    refreshCarLibrary();
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={t("Language")}>
      <Txt variant="titleSm" accessibilityRole="header">
        {t("Language")}
      </Txt>

      <ScrollView
        style={{ maxHeight: 420, marginTop: 8 }}
        showsVerticalScrollIndicator={false}
        accessibilityRole="radiogroup"
      >
        {SUPPORTED_LANGUAGES.map((language, i) => {
          const selected = language.code === active;
          return (
            <PressableScale
              key={language.code}
              onPress={() => void choose(language.code)}
              pressedScale={0.985}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${language.nativeName}, ${language.englishName}`}
              style={{
                minHeight: 60,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: i === SUPPORTED_LANGUAGES.length - 1 ? 0 : 1,
                borderBottomColor: colors.hairline,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyLg">{language.nativeName}</Txt>
                {language.nativeName !== language.englishName ? (
                  <Txt variant="caption" color={colors.inkSoft}>
                    {language.englishName}
                  </Txt>
                ) : null}
              </View>
              {selected ? <Icon name="check_circle" size={22} color={colors.signal} filled /> : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

/** The current language in its own name, for the control that opens the sheet. */
export function currentLanguageName(): string {
  const code = currentLanguage();
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.nativeName ?? "English";
}
