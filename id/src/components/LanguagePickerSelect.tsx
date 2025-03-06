"use client";

export function LanguagePickerSelect({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    document.cookie = `_noo_locale=${e.target.value}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <select
      className="text-xs p-2.5 hover:bg-blue-200 dark:hover:bg-white/20 rounded-md"
      aria-label="Language"
      onChange={handleChange}
      defaultValue={locale}
    >
      {children}
    </select>
  );
}
