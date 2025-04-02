import acceptLanguage from "accept-language";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

// Bosnian, Croatian, Montenegrin and Serbian are secretly the same language 🤫
// I didn't decide this, I'm just a developer.
const BCMS = ["sr", "bs", "me"];

// SUPPORTED_LANGUAGES are expected to have translations in the messages directory.
// This secondary array helps us map commonly used language codes to the supported ones.
// nb is the most common type of Norwegian, but we use no as the supported language code.
const expandedSupportedLanguages =
  SUPPORTED_LANGUAGES.concat(BCMS).concat("nb");

acceptLanguage.languages(expandedSupportedLanguages);

import { readFile } from "fs/promises";
import JSON5 from "json5";
import { SUPPORTED_LANGUAGES } from ".";

async function loadJSON5(filename: string) {
  const json5 = await readFile(filename, "utf8");
  return JSON5.parse(json5);
}

const normalizedLocales = {
  bs: "hr",
  sr: "hr",
  me: "hr",
  nb: "no",
} as const as Record<string, string>;

export async function getCurrentLocale() {
  // First use the locale from the user's profile, if available.
  let locale = (await getLocaleFromUser()) as string | undefined;

  // Fallback to the locale as saved in a cookie.
  if (!locale) {
    const cookieStore = await cookies();
    const lngCookie = cookieStore.get("_noo_locale")?.value;

    // The cookie locale must be validated, as it could be tampered with.
    if (lngCookie && expandedSupportedLanguages.includes(lngCookie)) {
      locale = lngCookie;
    }
  }

  // Fallback to the locale from the request headers.
  if (!locale) {
    const reqHeaders = await headers();
    const lngHeader = reqHeaders.get("accept-language");

    locale = acceptLanguage.get(lngHeader) ?? undefined;
  }

  // Fallback to English.
  return locale ?? "en";
}

// Some locale codes are aliases for others.
export async function getCurrentNormalizedLocale() {
  const locale = await getCurrentLocale();
  return normalizedLocales[locale] ?? locale;
}

export async function i18nConfig() {
  const locale = await getCurrentNormalizedLocale();

  return {
    locale,
    messages: {
      // Load your messages from the filesystem.
    },
  };
}

// This awkwardness is a gift of Next.js...
async function getLocaleFromUser() {
  // The current URL is set in the headers by @/middleware.ts
  const headerStore = await headers();
  const requestUrl = headerStore.get("x-ssr-url");
  if (!requestUrl) {
    return;
  }

  // Determine if there's an uid query parameter
  const uid = new URL(requestUrl).searchParams.get("uid");
  if (!uid) {
    return;
  }

  // TODO
  return;

  // Get the user's locale from the database
  // const userId = humanIdToUuid(uid, "usr");
  // if (!userId) {
  //   return;
  // }

  // const user = await Users.find(userId);
  // if (!user) {
  //   return;
  // }

  // return user.locale;
}

export default getRequestConfig(i18nConfig);
