import { SelectInput } from "@noo/ui";

type Props = {
  children: React.ReactNode;
  locale: string;
  className?: string;
  kind?: "regular" | "flat";
  handleLocaleChange?: (locale: string) => void;
};

export function LanguagePickerSelect({
  children,
  locale,
  className,
  kind = "regular",
  handleLocaleChange,
}: Readonly<Props>) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleLocaleChange?.(e.target.value);
  };

  let classes = className;
  if (kind === "flat") {
    classes +=
      " dark:outline-0 text-xs py-2.5 ps-2.5 hover:bg-blue-200 dark:hover:bg-white/20 rounded-md field-sizing-content";
  }

  return (
    <SelectInput
      className={classes}
      aria-label="Language"
      onChange={handleChange}
      defaultValue={locale}
      name="language"
    >
      {children}
    </SelectInput>
  );
}
