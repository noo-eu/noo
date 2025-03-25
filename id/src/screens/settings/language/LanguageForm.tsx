"use client";

import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useAuth } from "@/auth/authContext";
import { ProfileFormLayout } from "@/screens/profile/ProfileFormLayout";
import { useLanguageForm } from "./useLanguageForm";
import { CancelLink } from "@/screens/profile/CancelLink";
import { LanguagePicker } from "@/components/LanguagePicker";
import { updateLanguage } from "@/app/settings/language/actions";

export function LanguageForm() {
  const user = useAuth();

  const { formAction, isPending } = useLanguageForm(
    updateLanguage.bind(null, user.id),
  );

  const t = useTranslations("settings.language");
  const commonT = useTranslations("common");

  return (
    <ProfileFormLayout>
      <h1 className="text-2xl mb-4">{t("title")}</h1>

      <p className="text-sm my-6">{t("description")}</p>

      <form
        action={formAction}
        className="space-y-8"
        data-testid="timeZone-form"
      >
        <LanguagePicker autoSave={false} />

        <div className="flex gap-4 justify-end items-center">
          <CancelLink section="settings" />
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </form>
    </ProfileFormLayout>
  );
}
