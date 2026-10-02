/**
 * The languages the app is translated into. English is the source: its strings
 * are the keys every other language is looked up by.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", nativeName: "English", englishName: "English", rtl: false },
  { code: "es", nativeName: "Español", englishName: "Spanish", rtl: false },
  { code: "pt-BR", nativeName: "Português (Brasil)", englishName: "Portuguese", rtl: false },
  { code: "fr", nativeName: "Français", englishName: "French", rtl: false },
  { code: "de", nativeName: "Deutsch", englishName: "German", rtl: false },
  { code: "it", nativeName: "Italiano", englishName: "Italian", rtl: false },
  { code: "ru", nativeName: "Русский", englishName: "Russian", rtl: false },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish", rtl: false },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", rtl: true },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", rtl: false },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

/** The supported language that best matches a locale tag like "pt-PT" or "ar-EG". */
export function matchLanguage(tag: string | null | undefined): LanguageCode | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();

  const exact = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;

  const base = lower.split("-")[0];
  const sameBase = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase().split("-")[0] === base);
  return sameBase?.code ?? null;
}

export function isRtl(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code && l.rtl);
}
