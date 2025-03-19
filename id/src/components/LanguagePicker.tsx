import { LANGUAGE_NAMES } from "@/i18n";
import { useLocale } from "next-intl";
import { LanguagePickerSelect } from "./LanguagePickerSelect";

export function LanguagePicker({ className }: { className?: string }) {
  // Sort the LANGUAGE_NAMES by the value using the localeCompare method
  const languages = Object.entries(LANGUAGE_NAMES).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  const locale = useLocale();

  // TODO: this currently collapses all BCMS languages into Croatian, it could
  // be more friendly by acknowledging the specific language, but we have to
  // re-perform the checks from src/i18n/request.ts to do so.

  return (
    <LanguagePickerSelect locale={locale} className={className}>
      {languages.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </LanguagePickerSelect>
  );
}
