import { useState } from "react";
import { TextField, type TextFieldProps } from "./TextField";

export type PasswordFieldProps = Omit<TextFieldProps, "type"> & {
  t: (key: string) => string;
};

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const { t, ...rest } = props;

  return (
    <TextField
      {...rest}
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
