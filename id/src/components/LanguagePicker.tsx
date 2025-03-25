"use client";

import { LANGUAGE_NAMES } from "@/i18n";
import { useLocale } from "next-intl";
import { LanguagePickerSelect } from "./LanguagePickerSelect";

export function LanguagePicker({
  className,
  autoSave = true,
}: Readonly<{ className?: string; autoSave?: boolean }>) {
  // Sort the LANGUAGE_NAMES by the value using the localeCompare method
  const languages = Object.entries(LANGUAGE_NAMES).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  const locale = useLocale();

  // TODO: this currently collapses all BCMS languages into Croatian, it could
  // be more friendly by acknowledging the specific language, but we have to
  // re-perform the checks from src/i18n/request.ts to do so.

  const handleChange = (locale: string) => {
    if (autoSave) {
      // This is only used while the user is not authenticated (signin and
      // signup), and if the user wants to override their Accept-Language
      // header. So, we set a session cookie here and forget about it once the
      // browser is closed.

      document.cookie = `_noo_locale=${locale}; path=/`;
      window.location.reload();
    }
  };

  return (
    <LanguagePickerSelect
      locale={locale}
      className={className}
      handleLocaleChange={handleChange}
    >
      {languages.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </LanguagePickerSelect>
  );
}
