import { load, rootDirectories } from "./common";
import { recursiveKeyCheck } from "./translateMissing";

export async function checkMissing(languages: string[]) {
  const directories = await rootDirectories();
  let missing = false;

  // Check that translation files have no missing keys
  for (const directory of directories) {
    const en = await load(directory, "en");

    for (const language of languages) {
      const other = await load(directory, language);

      let misses: string[] = [];
      recursiveKeyCheck(en, other, misses);

      if (misses.length > 0) {
        console.warn(`Missing keys in ${directory}/${language}.json`);

        for (const miss of misses) {
          console.warn(`  - ${miss}`);
        }

        missing = true;
      }
    }
  }

  return missing;
}
