"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
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
          className="text-gray-500 cursor-pointer absolute end-0 top-0"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? undefined : t("ariaLabelShow")}
        >
          {visible ? t("hide") : t("show")}
        </button>
      }
    />
  );
}
