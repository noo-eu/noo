import acceptLanguage from "accept-language-parser";
import { readdir } from "fs/promises";

export const SUPPORTED_LANGUAGES = [
  "en",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "es",
  "et",
  "fi",
  "fr",
  "ga",
  "hr",
  "hu",
  "it",
  "is",
  "lt",
  "lv",
  "mt",
  "nl",
  "no",
  "pl",
  "pt",
  "tr",
  "ro",
  "sk",
  "sl",
  "sq",
  "sv",
  "uk",
];

// Bosnian, Croatian, Montenegrin and Serbian are secretly the same language 🤫
// Hot take?
export const EXTENDED_SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.concat([
  "bs",
  "me",
  "nb",
  "sr",
]);

const normalizedLocales = {
  bs: "hr",
  sr: "hr",
  me: "hr",
  nb: "no",
} as const as Record<string, string>;

export function normalizeLocale(locale: string): string {
  return normalizedLocales[locale] ?? locale;
}

function localeFromCookies(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => c.split("=")),
  );

  const locale = cookies["_noo_locale"];
  if (!locale) {
    return;
  }

  return normalizeLocale(locale);
}

export function localeFromRequest(request: Request): string {
  const fromCookies = localeFromCookies(request);
  if (fromCookies) {
    return fromCookies;
  }

  const allLocales = EXTENDED_SUPPORTED_LANGUAGES;
  const header = request.headers.get("accept-language") || "en";
  const locale = acceptLanguage.pick(allLocales, header) || "en";

  return normalizeLocale(locale);
}

/**
 * Loads all messages for the given locale from the messages folder.
 *
 * You really should cache this in production.
 *
 * @param locale - The locale to load messages for.
 * @returns An object containing the messages.
 */
export async function loadMessages(
  locale: string,
): Promise<Record<string, string>> {
  // Get the list of directories in the messages folder
  const directories = await readdir("./messages", {
    recursive: true,
  });

  // Find all files called `{locale}.json` in the directories
  const files = directories.filter((file) => {
    return file.endsWith(`${locale}.json`);
  });

  // Read all files and parse them as JSON
  const messages = await Promise.all(
    files.map(async (file) => {
      // Import the file as JSON, relative to the working directory
      const module = await import(`${process.cwd()}/messages/${file}`);
      // Get the default export, which is the messages object
      return module.default;
    }),
  );

  // Merge all messages into a single object
  return Object.assign({}, ...messages);
}
