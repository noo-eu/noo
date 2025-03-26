import { exists } from "fs/promises";
import { writeFile } from "fs/promises";
import { readFile } from "fs/promises";
import json5 from "json5";
import path from "path";

import { sort } from "./sort";
import { readdir } from "fs/promises";

export type TranslationFile = {
  [key: string]: string | string[] | TranslationFile;
};

export async function projectRoot() {
  const cwd = process.cwd();

  // I18n-utils is expected to be executed at the root of each app, but we can
  // traverse back until we find a package.json file.

  let currentPath = cwd;
  while (!(await exists(path.join(currentPath, "package.json")))) {
    currentPath = path.join(currentPath, "..");
    if (currentPath === "/") {
      throw new Error("Could not find package.json");
    }
  }

  return currentPath;
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

export async function load(
  dir: string,
  language: string,
): Promise<TranslationFile> {
  const root = await projectRoot();
  const file = path.join(root, `src/messages/${dir}/${language}.json`);

  try {
    const sourceContent = await readFile(file, "utf-8");
    return json5.parse(sourceContent);
  } catch (error) {
    // @ts-expect-error Error is not typed.
    console.warn(`Failed to load ${file}: ${error.message}`);
    return {};
  }
}

export async function save(
  dir: string,
  language: string,
  content: TranslationFile,
) {
  const root = await projectRoot();
  const file = path.join(root, `src/messages/${dir}/${language}.json`);
  const json = JSON.stringify(sort(content), null, 2) + "\n";

  await writeFile(file, json);
}

export async function rootDirectories() {
  const root = await projectRoot();

  // List all files in the src/messages directory.
  const files = await readdir(path.join(root, "src/messages"), {
    recursive: true,
  });

  // Locate all directories containing an en.json file.
  return files
    .filter((file) => file.endsWith("en.json"))
    .map((file) => file.replace(/\/[^/]+$/, ""));
}

export async function fixDirectories(languages: string[]) {
  const root = await projectRoot();
  const directories = await rootDirectories();

  for (const directory of directories) {
    for (const language of languages) {
      // Ensure that all directories have all languages.
      const fullPath = path.join(
        root,
        "src/messages",
        directory,
        `${language}.json`,
      );

      if (await exists(fullPath)) {
        continue;
      }

      await save(directory, language, {});
    }
  }
}
