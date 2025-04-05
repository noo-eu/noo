import { Button } from "@noo/ui";
import { useTranslations } from "use-intl";
import { LanguagePicker } from "~/components/LanguagePicker";
import { CancelLink } from "~/screens/profile/CancelLink";
import { ProfileFormLayout } from "~/screens/profile/ProfileFormLayout";
import { useLanguageForm } from "./useLanguageForm";

export function LanguageForm() {
  const t = useTranslations("settings.language");
  const commonT = useTranslations("common");

  const { Form, isPending } = useLanguageForm();

  return (
    <ProfileFormLayout>
      <h1 className="text-2xl mb-4">{t("title")}</h1>

      <p className="text-sm my-6">{t("description")}</p>

      <Form method="POST" className="space-y-8" data-testid="timeZone-form">
        <LanguagePicker autoSave={false} />

        <div className="flex gap-4 justify-end items-center">
          <CancelLink section="settings" />
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </Form>
    </ProfileFormLayout>
  );
}
