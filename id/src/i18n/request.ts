import acceptLanguage from "accept-language";
import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

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
  "lt",
  "lv",
  "mt",
  "nl",
  "pl",
  "pt",
  "ro",
  "sk",
  "sl",
  "sv",
];

acceptLanguage.languages(SUPPORTED_LANGUAGES);

import { readFile } from "fs/promises";
import JSON5 from "json5";

async function loadJSON5(filename: string) {
  const json5 = await readFile(filename, "utf8");
  return JSON5.parse(json5);
}

export default getRequestConfig(async () => {
  const reqHeaders = await headers();
  const lngHeader = reqHeaders.get("accept-language");

  const locale = acceptLanguage.get(lngHeader) || "en";

  return {
    locale,
    messages: {
      ...(await loadJSON5(`src/messages/common/${locale}.json`)),
      ...(await loadJSON5(`src/messages/oidc/${locale}.json`)),
      ...(await loadJSON5(`src/messages/signin/${locale}.json`)),
      ...(await loadJSON5(`src/messages/signup/${locale}.json`)),
    },
  };
});
