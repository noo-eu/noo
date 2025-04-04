import { useTranslations } from "use-intl";

const AGGREGATED_TIMEZONES = {
  "Africa/Ceuta": "CET",
  "America/Danmarkshavn": "GMT",
  "Atlantic/Canary": "GMT",
  "Atlantic/Faroe": "GMT",
  "Atlantic/Madeira": "GMT",
  "Europe/Andorra": "CET",
  "Europe/Athens": "EET",
  "Europe/Belgrade": "CET",
  "Europe/Berlin": "CET",
  "Europe/Brussels": "CET",
  "Europe/Bucharest": "EET",
  "Europe/Budapest": "CET",
  "Europe/Chisinau": "EET",
  "Europe/Dublin": "GMT",
  "Europe/Gibraltar": "CET",
  "Europe/Helsinki": "EET",
  "Europe/Kaliningrad": "EET",
  "Europe/Kyiv": "EET",
  "Europe/Lisbon": "GMT",
  "Europe/London": "GMT",
  "Europe/Madrid": "CET",
  "Europe/Malta": "CET",
  "Europe/Paris": "CET",
  "Europe/Prague": "CET",
  "Europe/Riga": "EET",
  "Europe/Rome": "CET",
  "Europe/Sofia": "EET",
  "Europe/Tallinn": "EET",
  "Europe/Tirane": "CET",
  "Europe/Vienna": "CET",
  "Europe/Vilnius": "EET",
  "Europe/Warsaw": "CET",
  "Europe/Zurich": "CET",

  // Linked to one of the above
  "Arctic/Longyearbyen": "CET",
  "Europe/Amsterdam": "CET",
  "Europe/Belfast": "GMT",
  "Europe/Bratislava": "CET",
  "Europe/Busingen": "CET",
  "Europe/Copenhagen": "CET",
  "Europe/Guernsey": "GMT",
  "Europe/Isle_of_Man": "GMT",
  "Europe/Jersey": "GMT",
  "Europe/Kiev": "EET",
  "Europe/Ljubljana": "CET",
  "Europe/Luxembourg": "CET",
  "Europe/Mariehamn": "EET",
  "Europe/Monaco": "CET",
  "Europe/Nicosia": "EET",
  "Europe/Oslo": "CET",
  "Europe/Podgorica": "CET",
  "Europe/San_Marino": "CET",
  "Europe/Sarajevo": "CET",
  "Europe/Skopje": "CET",
  "Europe/Stockholm": "CET",
  "Europe/Tiraspol": "EET",
  "Europe/Uzhgorod": "EET",
  "Europe/Vaduz": "CET",
  "Europe/Vatican": "CET",
  "Europe/Zagreb": "CET",
  "Europe/Zaporozhye": "EET",
} as Record<string, "CET" | "EET" | "GMT" | undefined>;

export function getNormalizedTimeZone(timeZone: string) {
  return AGGREGATED_TIMEZONES[timeZone] ?? timeZone;
}

export function getSelect() {
  const supported = Intl.supportedValuesOf("timeZone");

  const uncommonTzs = supported
    .filter((tz) => !AGGREGATED_TIMEZONES[tz])
    .filter((tz) => !tz.startsWith("Etc/") && !tz.startsWith("UTC"));

  const byContinent = uncommonTzs.reduce(
    (acc, tz) => {
      const [continent] = tz.split("/");
      if (!acc[continent]) {
        acc[continent] = [];
      }

      acc[continent].push(timeZoneOption(tz));

      return acc;
    },
    {} as Record<string, { label: string; value: string }[]>,
  );

  // Sort the time zones by label
  for (const continent in byContinent) {
    byContinent[continent].sort((a, b) => a.label.localeCompare(b.label));
  }

  return byContinent;
}

function timeZoneOption(tz: string) {
  return {
    label: timeZoneOptionLabel(tz),
    value: tz,
  };
}

function timeZoneOptionLabel(tz: string) {
  const parts = tz.split("/");
  const city = parts[parts.length - 1].replaceAll("_", " ");

  return city;
}

export function displayTz(t: ReturnType<typeof useTranslations>, tz: string) {
  if (tz === "GMT") {
    return t("gmt");
  } else if (tz === "CET") {
    return t("cet");
  } else if (tz === "EET") {
    return t("eet");
  }

  return tz.replace("_", " ").replace("/", " / ");
}
