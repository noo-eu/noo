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

export async function i18nConfig() {
  const cookieStore = await cookies();
  const lngCookie = cookieStore.get("_noo_locale")?.value;
  let locale: string | undefined;

  if (lngCookie && expandedSupportedLanguages.includes(lngCookie)) {
    locale = lngCookie;
  } else {
    const reqHeaders = await headers();
    const lngHeader = reqHeaders.get("accept-language");

    locale = acceptLanguage.get(lngHeader) ?? "en";
  }

  // We need to normalize the locale to the supported language codes.
  locale = BCMS.includes(locale) ? "hr" : locale;
  locale = locale == "nb" ? "no" : locale;

  return {
    locale,
    messages: {
      ...(await loadJSON5(`src/messages/common/${locale}.json`)),
      ...(await loadJSON5(`src/messages/oidc/${locale}.json`)),
      ...(await loadJSON5(`src/messages/profile/${locale}.json`)),
      ...(await loadJSON5(`src/messages/security/${locale}.json`)),
      ...(await loadJSON5(`src/messages/signin/${locale}.json`)),
      ...(await loadJSON5(`src/messages/signup/${locale}.json`)),
    },
  };
}

export default getRequestConfig(i18nConfig);
