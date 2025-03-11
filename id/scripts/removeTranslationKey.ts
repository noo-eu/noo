import { SUPPORTED_LANGUAGES } from "@/i18n";
import json5 from "json5";

import { deleteKey, sort } from "./messages";

if (process.argv.length < 3) {
  console.error("Usage: removeTranslationKey.ts key directory");
  process.exit(1);
}

const key = process.argv[2];
const directory = process.argv[3];

for (const language of SUPPORTED_LANGUAGES) {
  const file = `src/messages/${directory}/${language}.json`;

  const sourceContent = await Bun.file(file).text();
  const source = json5.parse(sourceContent);

  deleteKey(source, key);
  Bun.write(file, JSON.stringify(sort(source), null, 2) + "\n");
}
