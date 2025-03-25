"use client";

import { LANGUAGE_NAMES } from "@/i18n";
import { LanguagePickerSelect } from "./LanguagePickerSelect";

export function LanguagePicker({
  className,
  autoSave = true,
}: Readonly<{ className?: string; autoSave?: boolean }>) {
  // Sort the LANGUAGE_NAMES by the value using the localeCompare method
  const languages = Object.entries(LANGUAGE_NAMES).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  return (
    <LanguagePickerSelect className={className} autoSave={autoSave}>
      {languages.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </LanguagePickerSelect>
  );
}
