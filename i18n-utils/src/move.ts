import { deleteKey, load, save, setKey } from "./common";

export async function move(
  languages: string[],
  sourceDirectory: string,
  sourceKey: string,
  targetDirectory: string,
  targetKey: string,
) {
  for (const language of languages) {
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
