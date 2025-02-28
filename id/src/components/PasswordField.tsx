import { useState } from "react";
import { TextField, Props as TextFieldProps } from "./TextField";
import { useTranslations } from "next-intl";

export type Props = Omit<TextFieldProps, "type">;

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("common.passwordField");

  props.aroundLabel ??= (children) => (
    <div className="flex justify-between">
      {children}
      <button
        type="button"
        className="text-gray-500 cursor-pointer"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? undefined : t("ariaLabelShow")}
      >
        {visible ? t("hide") : t("show")}
      </button>
    </div>
  );

  return <TextField type={visible ? "text" : "password"} {...props} />;
}
