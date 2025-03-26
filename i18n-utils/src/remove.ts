import { load, deleteKey, save } from "./common";

export async function remove(languages: string[], dir: string, key: string) {
  for (const language of languages) {
    const content = await load(dir, language);

    deleteKey(content, key);

    await save(dir, language, content);
  }
}
