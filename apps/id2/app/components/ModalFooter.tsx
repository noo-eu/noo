import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { LanguagePicker } from "./LanguagePicker";

export function ModalFooter() {
  const t = useTranslations("common");

  return (
    <div className="w-full flex justify-end space-x-4 my-4 px-8 sm:px-0">
      <Link
        to="/"
        className="text-xs hover:bg-blue-200 dark:hover:bg-white/20 p-2.5 rounded-md"
      >
        {t("terms")}
      </Link>
      <Link
        to="/"
        className="text-xs hover:bg-blue-200 dark:hover:bg-white/20 p-2.5 rounded-md"
      >
        {t("privacy")}
      </Link>
      <LanguagePicker className="text-end" kind="flat" />
    </div>
  );
}
