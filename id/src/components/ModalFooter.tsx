import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguagePicker } from "./LanguagePicker";

export function ModalFooter() {
  const t = useTranslations("common");

  return (
    <div className="w-full flex justify-end space-x-4 my-4 px-8 sm:px-0">
      <Link
        href="/"
        className="text-xs hover:bg-blue-200 dark:hover:bg-white/20 p-2.5 rounded-md"
      >
        {t("terms")}
      </Link>
      <Link
        href="/"
        className="text-xs hover:bg-blue-200 dark:hover:bg-white/20 p-2.5 rounded-md"
      >
        {t("privacy")}
      </Link>
      <LanguagePicker />
    </div>
  );
}
