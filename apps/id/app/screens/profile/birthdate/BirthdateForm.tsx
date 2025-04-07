import { Button, Noo, SelectField, TextField } from "@noo/ui";
import { useLocale, useTranslations } from "use-intl";
import { CancelLink } from "../CancelLink";
import { ProfileFormLayout } from "../ProfileFormLayout";
import { useBirthdateForm } from "./useBirthdateForm";

function monthsForLocale(locale: string) {
  const format = new Intl.DateTimeFormat(locale, { month: "long" }).format;
  return [...Array(12).keys()].map((m) => format(new Date(Date.UTC(2021, m))));
}

export function BirthdateForm() {
  const locale = useLocale();
  const months = monthsForLocale(locale);

  const { errors, input, isPending, Form } = useBirthdateForm();

  const t = useTranslations("profile");
  const commonT = useTranslations("common");

  return (
    <ProfileFormLayout>
      <h1 className="text-2xl mb-4">{t("birthdate.title")}</h1>

      <p className="mb-4 text-sm">
        {t.rich("birthdate.description", {
          noo: () => <Noo />,
        })}
      </p>

      <Form method="POST" className="space-y-8" data-testid="birthdate-form">
        <div className="flex gap-3">
          <TextField
            label={t("birthdate.day")}
            name="day"
            defaultValue={input.day}
            size={3}
            maxLength={2}
            error={errors?.day && t(`birthdate.errors.${errors.day}`)}
          />
          <SelectField
            label={t("birthdate.month")}
            name="month"
            defaultValue={input.month}
            className="flex-3"
            error={errors?.month && t(`birthdate.errors.${errors.month}`)}
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </SelectField>
          <TextField
            label={t("birthdate.year")}
            name="year"
            defaultValue={input.year}
            size={5}
            maxLength={4}
            error={errors?.year && t(`birthdate.errors.${errors.year}`)}
          />
        </div>

        <div className="flex gap-4 justify-end items-center">
          <CancelLink />
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </Form>
    </ProfileFormLayout>
  );
}
