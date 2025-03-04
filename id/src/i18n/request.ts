import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import acceptLanguage from "accept-language";

export const SUPPORTED_LANGUAGES = [
  "en",
  "bg",
  "hr",
  "cs",
  "da",
  "nl",
  "et",
  "fi",
  "fr",
  "de",
  "el",
  "hu",
  "ga",
  "it",
  "lv",
  "lt",
  "mt",
  "pl",
  "pt",
  "ro",
  "sk",
  "sl",
  "es",
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
