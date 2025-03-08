import { useTranslations } from "next-intl";
import { useState } from "react";
import { TextField, TextFieldProps } from "./TextField";

export type PasswordFieldProps = Omit<TextFieldProps, "type">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("common.passwordField");

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      wrapper={{ className: "relative" }}
      append={
        <button
          type="button"
          className="text-gray-500 cursor-pointer absolute right-0 top-0"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? undefined : t("ariaLabelShow")}
        >
          {visible ? t("hide") : t("show")}
        </button>
      }
    />
  );
}
