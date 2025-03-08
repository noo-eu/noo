"use client";

import { Button, TextField, SelectField } from "@noo/ui";
import { useActionState, useEffect } from "react";
import { updateBirthdate, UpdateBirthdateState } from "../actions";
import { redirect } from "next/navigation";
import toast from "react-hot-toast";
import { PageModal } from "@/components/PageModal";
import Link from "next/link";
import { Noo } from "@/components/Noo";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

type Props = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    birthdate: Date | null;
  };
};

function monthsForLocale(locale: string) {
  const format = new Intl.DateTimeFormat(locale, { month: "long" }).format;
  return [...Array(12).keys()].map((m) => format(new Date(Date.UTC(2021, m))));
}

export function Form({ user }: Props) {
  const day = user.birthdate?.getDate();
  const month = (user.birthdate?.getMonth() || 0) + 1;
  const year = user.birthdate?.getFullYear();

  const locale = useLocale();
  const months = monthsForLocale(locale);

  const [state, action, isPending] = useActionState(
    updateBirthdate.bind(null, user.id),
    {
      data: { success: false },
      input: { day, month, year },
    } as UpdateBirthdateState,
  );

  const t = useTranslations("profile");
  const commonT = useTranslations("common");

  useEffect(() => {
    if (state.data?.success) {
      // Redirect to the profile page
      toast.success(t("birthdate.updateSuccess"));
      redirect(`/?uid=${user.id}`);
    }
  }, [state.data, t, user.id]);

  return (
    <div className="max-w-xl w-full p-4 mx-auto">
      <PageModal footer={false}>
        <div className="text-lg mx-4 mb-2 flex items-center">
          <Link href={`/profile?uid=${user.id}`} aria-label={t("back")}>
            <ArrowLeftIcon className="size-6 inline-block me-2" />
          </Link>
          <h1>
            {t.rich("header", {
              noo: () => <Noo />,
            })}
          </h1>
        </div>
        <section>
          <PageModal.Modal className="!block">
            <h1 className="text-2xl mb-4">{t("birthdate.title")}</h1>

            <p className="mb-4 text-sm">
              {t.rich("birthdate.description", {
                noo: () => <Noo />,
              })}
            </p>

            <form action={action} className="space-y-8">
              <div className="flex gap-3">
                <TextField
                  label={t("birthdate.day")}
                  name="day"
                  defaultValue={state.input.day}
                  autoFocus
                  size={3}
                  maxLength={2}
                  error={
                    state.error?.day && t(`birthdate.errors.${state.error.day}`)
                  }
                />
                <SelectField
                  label={t("birthdate.month")}
                  name="month"
                  defaultValue={state.input.month}
                  className="flex-3"
                  error={
                    state.error?.month &&
                    t(`birthdate.errors.${state.error.month}`)
                  }
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
                  defaultValue={state.input.year}
                  size={5}
                  maxLength={4}
                  error={
                    state.error?.year &&
                    t(`birthdate.errors.${state.error.year}`)
                  }
                />
              </div>

              <div className="flex gap-4 justify-end items-center">
                <Link className="link p-2.5" href={`/?uid=${user.id}`}>
                  {commonT("cancel")}
                </Link>
                <Button type="submit" pending={isPending}>
                  {commonT("save")}
                </Button>
              </div>
            </form>
          </PageModal.Modal>
        </section>
      </PageModal>
    </div>
  );
}
