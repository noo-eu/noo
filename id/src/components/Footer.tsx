import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="mt-auto py-3 text-sm bg-eu-blue text-white text-center">
      {t("madeWith")}
    </footer>
  );
}
