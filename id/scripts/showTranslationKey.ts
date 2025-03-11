import { SUPPORTED_LANGUAGES } from "@/i18n";
import json5 from "json5";

import { getKey } from "./messages";

if (process.argv.length < 3) {
  console.error("Usage: showTranslationKey.ts key directory");
  process.exit(1);
}

const key = process.argv[2];
const directory = process.argv[3];

for (const language of SUPPORTED_LANGUAGES) {
  const file = `src/messages/${directory}/${language}.json`;

  const sourceContent = await Bun.file(file).text();
  const source = json5.parse(sourceContent);

  console.log(`${language}: ${getKey(source, key)}`);
}
