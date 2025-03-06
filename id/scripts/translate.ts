import { SUPPORTED_LANGUAGES } from "@/i18n";
import json5 from "json5";
import { readdir } from "node:fs/promises";

const files = await readdir("src/messages", { recursive: true });

// Find all directories that contain an "en.json" file
const directories = files
  .filter((file) => file.endsWith("en.json"))
  .map((file) => file.replace(/\/[^/]+$/, ""));

// Ensure that all directories contain all supported languages
for (const directory of directories) {
  for (const language of SUPPORTED_LANGUAGES) {
    if (!files.includes(`${directory}/${language}.json`)) {
      await Bun.write(`src/messages/${directory}/${language}.json`, "{}");
    }

    // Check if --force-sort is passed
    if (process.argv.includes("--force-sort")) {
      const content = await Bun.file(
        `src/messages/${directory}/${language}.json`,
      ).text();
      const parsed = json5.parse(content);
      const sorted = sort(parsed);
      Bun.write(
        `src/messages/${directory}/${language}.json`,
        JSON.stringify(sorted, null, 2),
      );
    }
  }
}

// Check that translation files have no missing keys
for (const directory of directories) {
  const en = json5.parse(
    await Bun.file(`src/messages/${directory}/en.json`).text(),
  );

  for (const language of SUPPORTED_LANGUAGES) {
    const other = json5.parse(
      await Bun.file(`src/messages/${directory}/${language}.json`).text(),
    );
    let misses: string[] = [];
    recursiveKeyCheck(en, other, misses);

    if (misses.length > 0) {
      const source = collect(en, misses);

      console.log(
        `Translating ${Object.keys(source).length} keys in ${directory}/${language}.json`,
      );
      const result = await translate(source, language);

      const final = sort(merge(other, result));
      Bun.write(
        `src/messages/${directory}/${language}.json`,
        JSON.stringify(final, null, 2),
      );
    }
  }
}

type TranslationFile = {
  [key: string]: string | TranslationFile;
};

function recursiveKeyCheck(
  reference: TranslationFile,
  other: TranslationFile,
  misses: string[],
  prefix = "",
) {
  for (const key of Object.keys(reference)) {
    if (typeof reference[key] === "object") {
      if (typeof other[key] === "string" || !other[key]) {
        other[key] = {};
      }
      recursiveKeyCheck(
        reference[key] as TranslationFile,
        other[key] as TranslationFile,
        misses,
        `${prefix}${key}.`,
      );
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
) {
  const localeNames: Record<string, string> = {
    bg: "Bulgarian",
    cs: "Czech",
    da: "Danish",
    de: "German",
    el: "Greek",
    es: "Spanish",
    et: "Estonian",
    fi: "Finnish",
    fr: "French",
    ga: "Irish",
    hr: "Croatian",
    hu: "Hungarian",
    it: "Italian",
    lt: "Lithuanian",
    lv: "Latvian",
    mt: "Maltese",
    nl: "Dutch",
    pl: "Polish",
    pt: "Portuguese",
    ro: "Romanian",
    sk: "Slovak",
    sl: "Slovenian",
    sv: "Swedish",
  };

  // Is this LLM abuse?
  let prompt = `It is of vital importance that you correctly translate this document to ${localeNames[targetLocale]}, making sure to use local spelling and idioms. The translations may use the ICU Message Format. Do not translate literally and **do not translate the object keys**. Do not leave the value empty. Only output JSON, without any surronding text: `;
  prompt += JSON.stringify(requests, null, 2);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: "gemma2",
      format: "json",
      stream: false,
    }),
  });

  const body = await response.json();
  const translations = JSON.parse(body.response);

  // Remove translation keys that were not in the original source
  for (const key of Object.keys(translations)) {
    if (!requests[key]) {
      delete translations[key];
    }
  }

  return translations;
}

function merge(base: TranslationFile, translation: Record<string, string>) {
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

function sort(obj: TranslationFile): TranslationFile {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const keys = Object.keys(obj).sort();
  const sorted: TranslationFile = {};

  // Add each key-value pair to the new object in sorted order
  // Sort nested objects recursively
  for (const key of keys) {
    if (typeof obj[key] === "object") {
      sorted[key] = sort(obj[key]);
    } else {
      sorted[key] = obj[key];
    }
  }

  return sorted;
}
