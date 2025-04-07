import { Button, PasswordField } from "@noo/ui";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { ProfileFormLayout } from "~/screens/profile/ProfileFormLayout";
import { PasswordBreachWarning } from "./PasswordBreachWarning";
import { PasswordRater } from "./PasswordRater";
import { usePasswordForm } from "./usePasswordForm";
import { usePasswordStrength, useZxcvbnConfig } from "./usePasswordStrength";

export function PasswordForm() {
  const user = useAuth();

  useZxcvbnConfig();

  const { errors, Form, isPending } = usePasswordForm();

  const t = useTranslations("security");
  const commonT = useTranslations("common");
  const passwordT = useTranslations("common.passwordField");

  const [password, setPassword] = useState<string>("");
  const strength = usePasswordStrength(password);

  return (
    <ProfileFormLayout>
      <h1 className="text-2xl mb-4">{t("password.title")}</h1>

      {user.passwordBreaches !== null && user.passwordBreaches > 0 && (
        <PasswordBreachWarning />
      )}

      <p className="mb-4 text-sm">{t("password.description1")}</p>

      <p className="mb-4 text-sm">{t("password.description2")}</p>

      <Form method="POST">
        <PasswordField
          label={t("password.label")}
          name="new-password"
          error={
            errors?.["new-password"] &&
            t(`password.errors.${errors["new-password"]}`)
          }
          onChange={(e) => setPassword(e.target.value)}
          focusOnLoad
          autoComplete="new-password"
          t={passwordT}
          min={10}
        />

        <div className="text-sm mb-8">
          <div className="mb-4">
            <PasswordRater password={password} strength={strength} />
          </div>

          {t("password.updateSuggestion")}
        </div>

        <PasswordField
          label={t("password.confirmLabel")}
          name="new-password-confirmation"
          error={
            errors?.["new-password-confirmation"] &&
            t(`password.errors.${errors["new-password-confirmation"]}`)
          }
          t={passwordT}
          autoComplete="new-password"
        />

        <p className="text-sm mt-4">{t("password.updateNotice")}</p>

        <div className="mt-8 flex gap-4 justify-end items-center">
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </Form>
    </ProfileFormLayout>
  );
}
