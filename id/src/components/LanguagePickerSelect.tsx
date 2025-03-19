"use client";

import { SelectInput } from "@noo/ui";

export function LanguagePickerSelect({
  children,
  locale,
  className,
}: {
  children: React.ReactNode;
  locale: string;
  className?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    document.cookie = `_noo_locale=${e.target.value}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <SelectInput
      className={`${className || ""} dark:outline-0 text-xs py-2.5 ps-2.5 hover:bg-blue-200 dark:hover:bg-white/20 rounded-md field-sizing-content`}
      aria-label="Language"
      onChange={handleChange}
      defaultValue={locale}
    >
      {children}
    </SelectInput>
  );
}
