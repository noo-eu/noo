import { load, rootDirectories, save, TranslationFile } from "./common";
import { LLM } from "./models";

const LOCALE_NAMES: Record<string, string> = {
  bg: "Bulgarian",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  es: "Spanish (European)",
  et: "Estonian",
  fi: "Finnish",
  fr: "French",
  ga: "Irish",
  hr: "Croatian",
  hu: "Hungarian",
  it: "Italian",
  is: "Icelandic",
  lt: "Lithuanian",
  lv: "Latvian",
  mt: "Maltese",
  nl: "Dutch",
  no: "Norwegian (Bokmål)",
  pl: "Polish",
  pt: "Portuguese (European)",
  ro: "Romanian",
  sk: "Slovak",
  sl: "Slovenian",
  sq: "Albanian",
  sv: "Swedish",
  tr: "Turkish",
  uk: "Ukrainian",
};

export async function translateMissing(languages: string[], llmClient: LLM) {
  const directories = await rootDirectories();

  // Check that translation files have no missing keys
  for (const directory of directories) {
    const en = await load(directory, "en");

    for (const language of languages) {
      const other = await load(directory, language);

      let misses: string[] = [];
      recursiveKeyCheck(en, other, misses);

      if (misses.length > 0) {
        const source = collect(en, misses);

        console.log(
          `Translating ${Object.keys(source).length} keys in ${directory}/${language}.json`,
        );
        const result = await translate(source, language, llmClient);

        const final = merge(other, result);
        await save(directory, language, final);
      }
    }
  }
}

export function recursiveKeyCheck(
  reference: TranslationFile,
  other: TranslationFile,
  misses: string[],
  prefix = "",
) {
  for (const key of Object.keys(reference)) {
    if (typeof reference[key] === "object") {
      if (typeof other[key] === "string" || !other[key]) {
        other[key] = Array.isArray(reference[key]) ? [] : {};
      }

      if (Array.isArray(reference[key])) {
        if (!Array.isArray(other[key])) {
          delete other[key];
          other[key] = [];
        }
      } else {
        recursiveKeyCheck(
          reference[key],
          // @ts-expect-error we know it's an object
          other[key],
          misses,
          `${prefix}${key}.`,
        );
      }
    } else {
      if (typeof other[key] === "object") {
        delete other[key];
      }

      // @ts-expect-error trim is only on strings, but we know it's a string
      if (!other[key] || other[key].trim() === "") {
        misses.push(`${prefix}${key}`);
        other[key] = "";
      }
    }
  }
}

function collect(reference: TranslationFile, keys: string[]) {
  // keys is an array of "paths" to the missing keys, like ["signin.email.label"]
  // We want to collect all the missing keys in a single object
  const source: Record<string, string> = {};

  for (const key of keys) {
    const parts = key.split(".");
    let current = reference;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]] as TranslationFile;
    }
    source[key] = current[parts[parts.length - 1]] as string;
  }

  return source;
}

async function translate(
  requests: Record<string, string>,
  targetLocale: string,
  llmClient: LLM,
) {
  const system = `You must correctly translate this document to ${LOCALE_NAMES[targetLocale]}, making sure to use local spelling and idioms. \
    The translations may use the ICU Message Format. \
    Do not translate literally, prefer local idioms and customs (some sentences may make sense in English, but need some imagination in other languages). \
    Prefer an informal style, if the language allows. **DO NOT TRANSLATE THE JSON KEYS.** \
    If you see angled tags (<tags>) or placeholders in {brackets} those must be left as is. \
    Do not leave the value empty. Only output JSON, without any surronding text.`;

  const prompt = JSON.stringify(requests, null, 2);
  const translations = await llmClient.request(system, prompt);

  for (const key of Object.keys(translations)) {
    // Remove keys that were not in the original source
    if (!requests[key]) {
      console.warn(
        `Translation for ${key} in ${targetLocale} was not requested. Skipping.`,
      );
      delete translations[key];
      continue;
    }

    // Reject empty translations
    if (translations[key] === "") {
      console.warn(
        `Empty translation for ${key} in ${targetLocale}. Skipping.`,
      );
      delete translations[key];
      continue;
    }

    if (!Array.isArray(translations[key])) {
      // Verify that placeholders are all present and not translated
      if (!matchesPlaceholders(requests[key], translations[key])) {
        console.warn(
          `Placeholders do not match for ${key} in ${targetLocale}. Skipping.`,
        );
        delete translations[key];
        continue;
      }
    }

    // If the result is over 2.5x the length of the source, it's probably garbage
    if (translations[key].length > requests[key].length * 2.5) {
      console.warn(
        `Suspiciously long translation for ${key} in ${targetLocale}. Skipping.`,
      );
      delete translations[key];
    }
  }

  return translations;
}

function merge(
  base: TranslationFile,
  translation: Record<string, string | string[]>,
) {
  for (const key of Object.keys(translation)) {
    const parts = key.split(".");
    let current = base;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as TranslationFile;
    }
    current[parts[parts.length - 1]] = translation[key];
  }

  return base;
}

function matchesPlaceholders(source: string, translation: string) {
  const sourcePlaceholders = source.match(/{[^(}|\s)]+}/g) || [];
  const translationPlaceholders = translation.match(/{[^(}|\s)]+}/g) || [];

  if (sourcePlaceholders.length !== translationPlaceholders.length) {
    return false;
  }

  // make sure the keys are all the same
  const sourceSet = new Set(sourcePlaceholders.map((x) => x.slice(1, -1)));
  const translationSet = new Set(
    translationPlaceholders.map((x) => x.slice(1, -1)),
  );

  if (
    sourceSet.size !== translationSet.size ||
    [...sourceSet].some((x) => !translationSet.has(x))
  ) {
    return false;
  }

  // make sure they match in count
  const sourceMap = sourcePlaceholders.reduce(
    (acc, cur) => {
      const key = cur.slice(1, -1);
      acc[key] ||= 0;
      acc[key]++;
      return acc;
    },
    {} as Record<string, number>,
  );

  const translationMap = translationPlaceholders.reduce(
    (acc, cur) => {
      const key = cur.slice(1, -1);
      acc[key] ||= 0;
      acc[key]++;
      return acc;
    },
    {} as Record<string, number>,
  );

  for (const key of Object.keys(sourceMap)) {
    if (sourceMap[key] !== translationMap[key]) {
      return false;
    }
  }

  return true;
}
