import { deleteKey, load, save, setKey } from "./common";
import { existsSync, mkdirSync } from "fs";

export async function move(
  languages: string[],
  sourceDirectory: string,
  sourceKey: string,
  targetDirectory: string,
  targetKey: string,
) {
  for (const language of languages) {
    // const targetFile = `src/messages/${targetDirectory}/${language}.json`;

    // const dir = targetFile.split("/").slice(0, -1).join("/");
    // if (!existsSync(dir)) {
    //   mkdirSync(dir, { recursive: true });
    // }

    const source = await load(sourceDirectory, language);
    const target = await load(targetDirectory, language);

    const value = deleteKey(source, sourceKey);
    if (value) {
      setKey(target, targetKey, value);

      if (sourceDirectory !== targetDirectory) {
        await save(sourceDirectory, language, source);
      }
      await save(targetDirectory, language, target);
    }
  }
}
