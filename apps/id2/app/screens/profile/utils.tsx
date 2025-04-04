import { useFormatter, useTranslations } from "use-intl";

export function renderGender(
  user: {
    gender: "female" | "male" | "not_specified" | "custom";
    genderCustom: string | null;
  },
  t: ReturnType<typeof useTranslations>,
) {
  switch (user.gender) {
    case "custom":
      return user.genderCustom;
    case "male":
      return t("gender.male");
    case "female":
      return t("gender.female");
    case "not_specified":
      return <i>{t("summary.unspecifiedGender")}</i>;
  }
}

export function renderBirthdate(
  birthdate: Date,
  format: ReturnType<typeof useFormatter>,
) {
  return format.dateTime(birthdate, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
