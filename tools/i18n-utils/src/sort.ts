import { TranslationFile } from "./common";

export function sort(obj: TranslationFile): TranslationFile {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const sorted: TranslationFile = {};

  // Add each key-value pair to the new object in sorted order
  // Sort nested objects recursively, leave arrays as is
  for (const key of keys) {
    if (typeof obj[key] === "object") {
      if (Array.isArray(obj[key])) {
        sorted[key] = obj[key];
      } else {
        sorted[key] = sort(obj[key]);
      }
    } else {
      sorted[key] = obj[key];
    }
  }

  return sorted;
}
