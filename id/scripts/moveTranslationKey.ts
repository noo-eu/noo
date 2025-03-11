import { SUPPORTED_LANGUAGES } from "@/i18n";
import json5 from "json5";

import { deleteKey, setKey, sort } from "./messages";
import { existsSync, mkdirSync } from "fs";

if (process.argv.length < 4) {
  console.error(
    "Usage: moveTranslationKey.ts sourceKey sourceDirectory targetKey [targetDirectory]",
  );
  process.exit(1);
}

const sourceKey = process.argv[2];
const sourceDirectory = process.argv[3];
const targetKey = process.argv[4];
const targetDirectory = process.argv[5] || sourceDirectory;

for (const language of SUPPORTED_LANGUAGES) {
  const sourceFile = `src/messages/${sourceDirectory}/${language}.json`;
  const targetFile = `src/messages/${targetDirectory}/${language}.json`;

  const dir = targetFile.split("/").slice(0, -1).join("/");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sourceContent = await Bun.file(sourceFile).text();
  const source = json5.parse(sourceContent);

  let target = {};
  if (await Bun.file(targetFile).exists()) {
    const targetContent = await Bun.file(targetFile).text();
    target = json5.parse(targetContent);
  }

  const value = deleteKey(source, sourceKey);
  if (value) {
    setKey(target, targetKey, value);

    if (sourceFile !== targetFile) {
      Bun.write(sourceFile, JSON.stringify(source, null, 2) + "\n");
    }
    Bun.write(targetFile, JSON.stringify(sort(target), null, 2) + "\n");
  }
}
