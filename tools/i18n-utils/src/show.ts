import { getKey, load } from "./common";

export async function show(
  languages: string[],
  directory: string,
  key: string,
) {
  for (const language of languages) {
    const content = await load(directory, language);

    let value = getKey(content, key);
    if (typeof value === "object") {
      value = JSON.stringify(value, null, 2);
    }

    console.log(`${language}: ${value}`);
  }
}
