import { SUPPORTED_LANGUAGES } from "@/i18n";
import { readdir } from "fs/promises";
import json5 from "json5";

export type TranslationFile = {
  [key: string]: string | TranslationFile;
};

const files = await readdir("src/messages", { recursive: true });
export const directories = files
  .filter((file) => file.endsWith("en.json"))
  .map((file) => file.replace(/\/[^/]+$/, ""));

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
        JSON.stringify(sorted, null, 2) + "\n",
      );
    }
  }
}

export function sort(obj: TranslationFile): TranslationFile {
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

export function deleteKey(
  obj: TranslationFile,
  key: string,
): string | TranslationFile | undefined {
  const keys = key.split(".");

  let value: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    value = value[keys[i]];
    if (value === undefined) {
      return undefined;
    }
  }

  const lastKey = keys[keys.length - 1];
  const deleted = value[lastKey];
  delete value[lastKey];

  return deleted;
}

export function getKey(
  obj: TranslationFile,
  key: string,
): string | TranslationFile | undefined {
  const keys = key.split(".");

  let value: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    value = value[keys[i]];
    if (value === undefined) {
      return undefined;
    }
  }

  const lastKey = keys[keys.length - 1];
  return value[lastKey];
}

export function setKey(
  obj: TranslationFile,
  key: string,
  value: string | TranslationFile,
) {
  const keys = key.split(".");
  let target = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) {
      target[keys[i]] = {};
    }
    target = target[keys[i]] as TranslationFile;
  }

  target[keys[keys.length - 1]] = value;
}
