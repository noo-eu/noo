export const SUPPORTED_LANGUAGES = [
  "en",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "es",
  "et",
  "fi",
  "fr",
  "ga",
  "hr",
  "hu",
  "it",
  "is",
  "lt",
  "lv",
  "mt",
  "nl",
  "no",
  "pl",
  "pt",
  "tr",
  "ro",
  "sk",
  "sl",
  "sq",
  "sv",
  "uk",
];

// Bosnian, Croatian, Montenegrin and Serbian are secretly the same language 🤫
// Hot take?
export const EXTENDED_SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.concat([
  "bs",
  "me",
  "nb",
  "sr",
]);

const normalizedLocales = {
  bs: "hr",
  sr: "hr",
  me: "hr",
  nb: "no",
} as const as Record<string, string>;

export const LANGUAGE_NAMES = {
  en: "English",
  bg: "Български",
  bs: "Bosanski",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  el: "Ελληνικά",
  es: "Español",
  et: "Eesti",
  fi: "Suomi",
  fr: "Français",
  ga: "Gaeilge",
  hr: "Hrvatski",
  hu: "Magyar",
  it: "Italiano",
  is: "Íslenska",
  lt: "Lietuvių",
  lv: "Latviešu",
  me: "Crnogorski",
  mt: "Malti",
  nl: "Nederlands",
  no: "Norsk",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  sk: "Slovenčina",
  sl: "Slovenščina",
  sq: "Shqip",
  sr: "Српски",
  sv: "Svenska",
  tr: "Türkçe",
  uk: "Українська",
} as const as Record<string, string>;

export function normalizeLocale(locale: string): string {
  return normalizedLocales[locale] ?? locale;
}
