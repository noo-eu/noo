import { LANGUAGE_NAMES } from "@noo/lib/i18n";
import { LanguagePickerSelect } from "./LanguagePickerSelect";

export function LanguagePicker({
  className,
  autoSave = true,
  kind = "regular",
}: Readonly<{
  className?: string;
  autoSave?: boolean;
  kind?: "regular" | "flat";
}>) {
  // Sort the LANGUAGE_NAMES by the value using the localeCompare method
  const languages = Object.entries(LANGUAGE_NAMES).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  return (
    <LanguagePickerSelect className={className} autoSave={autoSave} kind={kind}>
      {languages.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </LanguagePickerSelect>
  );
}
