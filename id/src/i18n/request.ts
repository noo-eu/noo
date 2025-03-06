import acceptLanguage from "accept-language";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

acceptLanguage.languages(SUPPORTED_LANGUAGES);

import { readFile } from "fs/promises";
import JSON5 from "json5";
import { SUPPORTED_LANGUAGES } from ".";

async function loadJSON5(filename: string) {
  const json5 = await readFile(filename, "utf8");
  return JSON5.parse(json5);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const lngCookie = cookieStore.get("_noo_locale")?.value;
  let locale: string | undefined;
  if (lngCookie && SUPPORTED_LANGUAGES.includes(lngCookie)) {
    locale = lngCookie;
  } else {
    const reqHeaders = await headers();
    const lngHeader = reqHeaders.get("accept-language");

    locale = acceptLanguage.get(lngHeader) || "en";
  }

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
