import { SelectInput } from "@noo/ui";
import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  kind?: "regular" | "flat";
  autoSave?: boolean;
  handleLocaleChange?: (locale: string) => void;
};

export function LanguagePickerSelect({
  children,
  className,
  kind = "regular",
  autoSave,
  handleLocaleChange,
}: Readonly<Props>) {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(document.documentElement.lang);
  }, []);

  let classes = className;
  if (kind === "flat") {
    classes +=
      " dark:outline-0 text-xs py-2.5 ps-2.5 hover:bg-blue-200 dark:hover:bg-white/20 rounded-md field-sizing-content";
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = e.target.value;
    setValue(locale);

    if (autoSave) {
      // This is only used while the user is not authenticated (signin and
      // signup), and if the user wants to override their Accept-Language
      // header. So, we set a session cookie here and forget about it once the
      // browser is closed.

      document.cookie = `_noo_locale=${locale}; path=/`;
      window.location.reload();
    }

    handleLocaleChange?.(locale);
  };

  return (
    <SelectInput
      className={classes}
      aria-label="Language"
      onChange={handleChange}
      value={value}
      name="language"
      data-testid="language-picker"
    >
      {children}
    </SelectInput>
  );
}
