"use client";

import { Noo } from "@/components/Noo";
import { capitalizeName } from "@/lib/name";
import { Button, TextField } from "@noo/ui";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { useNameForm } from "./useNameForm";
import { useTranslations } from "next-intl";
import { CancelLink } from "../CancelLink";
import { ProfileFormLayout } from "../ProfileFormLayout";

export function NameForm({
  action,
}: {
  action: (_: unknown, data: FormData) => Promise<BasicFormAction>;
}) {
  const {
    errors,
    isPending,
    onSubmit,
    formAction,
    form: { firstName, setFirstName, lastName, setLastName },
  } = useNameForm(action);

  const t = useTranslations("profile.name");
  const commonT = useTranslations("common");

  return (
    <ProfileFormLayout>
      <h2 className="text-2xl mb-4">{t("title")}</h2>

      <p className="mb-4 text-sm">
        {t.rich("description", {
          noo: () => <Noo />,
        })}
      </p>

      <form
        action={formAction}
        onSubmit={onSubmit}
        className="space-y-8"
        role="form"
      >
        <TextField
          label={t("firstName")}
          name="firstName"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
          }}
          onBlur={(e) => {
            setFirstName(capitalizeName(e.target.value));
          }}
          error={errors?.firstName && t(`errors.${errors.firstName}`)}
          autoFocus
        />
        <TextField
          label={t("lastName")}
          name="lastName"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
          }}
          onBlur={(e) => {
            setLastName(capitalizeName(e.target.value));
          }}
          error={errors?.lastName && t(`errors.${errors.lastName}`)}
        />

        <p className="text-sm">
          {t.rich("updateNotice", {
            noo: () => <Noo />,
          })}
        </p>

        <div className="flex gap-4 justify-end items-center">
          <CancelLink />
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </form>
    </ProfileFormLayout>
  );
}
