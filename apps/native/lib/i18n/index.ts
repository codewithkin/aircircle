import { getLocales } from "expo-localization";
import i18next from "i18next";
import { I18nManager } from "react-native";

import { DEFAULT_LANGUAGE, isRtl, matchLanguage } from "@/lib/i18n/languages";
import type { LanguageCode } from "@/lib/i18n/languages";
import ar from "@/lib/i18n/locales/ar.json";
import de from "@/lib/i18n/locales/de.json";
import en from "@/lib/i18n/locales/en.json";
import es from "@/lib/i18n/locales/es.json";
import fr from "@/lib/i18n/locales/fr.json";
import hi from "@/lib/i18n/locales/hi.json";
import it from "@/lib/i18n/locales/it.json";
import ptBR from "@/lib/i18n/locales/pt-BR.json";
import ru from "@/lib/i18n/locales/ru.json";
import tr from "@/lib/i18n/locales/tr.json";
import { getJson } from "@/lib/storage";

/**
 * Translations.
 *
 * English is the source and its strings are the keys: `t("Search live radio")`
 * returns the same text in English and the translation in any other language.
 * That keeps screens readable — the copy is right there in the code — and
 * means a missing translation shows English rather than a key name.
 *
 * Only strings that change shape by count (singular/plural) live in `en.json`;
 * everything else in English needs no file at all.
 *
 * The layout is never mirrored. Arabic reads right-to-left inside its own
 * text, but the screens — the player, the dial, the lists — stay as drawn.
 */

/** The language saved in Settings, read straight from storage at startup. */
function savedLanguage(): LanguageCode | null {
  const settings = getJson<{ language?: string | null }>("settings");
  return matchLanguage(settings?.language);
}

/** The device's own language, if the app is translated into it. */
export function deviceLanguage(): LanguageCode {
  try {
    for (const locale of getLocales()) {
      const match = matchLanguage(locale.languageTag);
      if (match) return match;
    }
  } catch {
    /* fall through to the default */
  }
  return DEFAULT_LANGUAGE;
}

// A device set to Arabic must not flip the whole app behind our back.
I18nManager.allowRTL(false);

void i18next.init({
  lng: savedLanguage() ?? deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  resources: {
    en: { translation: en },
    es: { translation: es },
    "pt-BR": { translation: ptBR },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    ru: { translation: ru },
    tr: { translation: tr },
    ar: { translation: ar },
    hi: { translation: hi },
  },
  // Keys are whole English sentences, so "." and ":" are just punctuation.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  // Resources are bundled, so initialisation completes before the first render.
  initAsync: false,
});

type Values = Record<string, string | number>;

/**
 * Translates a string. The key is the English text; `{{name}}` placeholders
 * are filled from `values`, and a `count` value picks the plural form.
 */
export function t(key: string, values?: Values): string {
  return i18next.t(key, values) as string;
}

/**
 * Marks a string for translation without translating it yet — for text held
 * in constants, which are built once and must be translated when shown.
 * Pass the result to `t()` at render time.
 */
export function msg(key: string): string {
  return key;
}

export function currentLanguage(): LanguageCode {
  return (matchLanguage(i18next.language) ?? DEFAULT_LANGUAGE) as LanguageCode;
}

/** Whether the current language is written right-to-left. */
export function isRtlLanguage(): boolean {
  return isRtl(currentLanguage());
}

/** Switches language. The caller remounts the screens so every string updates. */
export async function changeLanguage(code: LanguageCode): Promise<void> {
  await i18next.changeLanguage(code);
}
