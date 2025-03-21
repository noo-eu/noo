"use client";

import { Noo } from "@/components/Noo";
import { Button, SelectField, TextField } from "@noo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/auth/authContext";
import { ProfileFormLayout } from "../ProfileFormLayout";
import { useGenderForm } from "./useGenderForm";
import { CancelLink } from "../CancelLink";
import { updateGender } from "@/app/profile/gender/actions";

export function GenderForm() {
  const user = useAuth();

  const { formAction, isPending } = useGenderForm(
    updateGender.bind(null, user.id),
  );

  const t = useTranslations("profile");
  const commonT = useTranslations("common");
  const locale = useLocale();

  // Some languages are not gendered
  const isGendered = !["et", "fi", "hu", "tr"].includes(locale);

  const [gender, setGender] = useState<string>(user.gender);
  const [pronouns, setPronouns] = useState<string | null>(null);

  return (
    <ProfileFormLayout>
      <h1 className="text-2xl mb-4">{t("gender.title")}</h1>

      <p className="mb-4 text-sm">
        {t.rich("gender.description", {
          noo: () => <Noo />,
        })}
      </p>

      <form action={formAction} className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            onChange={(e) => setGender(e.target.value)}
            type="radio"
            name="gender"
            value="female"
            defaultChecked={user.gender == "female"}
          />
          {t("gender.female")}
        </label>
        <label className="flex items-center gap-2">
          <input
            onChange={(e) => setGender(e.target.value)}
            type="radio"
            name="gender"
            value="male"
            defaultChecked={user.gender == "male"}
          />
          {t("gender.male")}
        </label>
        <label className="flex items-center gap-2">
          <input
            onChange={(e) => setGender(e.target.value)}
            type="radio"
            name="gender"
            value="not_specified"
            defaultChecked={user.gender == "not_specified"}
          />
          {t("gender.unspecified")}
        </label>
        <label className="flex items-center gap-2">
          <input
            onChange={(e) => setGender(e.target.value)}
            type="radio"
            name="gender"
            value="custom"
            defaultChecked={user.gender == "custom"}
          />
          {t("gender.custom")}
        </label>

        {gender === "custom" && (
          <>
            <TextField
              name="genderCustom"
              label={t("gender.customLabel")}
              defaultValue={user.genderCustom || ""}
              required
            />
            <SelectField
              name="pronouns"
              label={t("gender.pronounsLabel")}
              onChange={(e) => setPronouns(e.target.value)}
              defaultValue={user.pronouns}
              required
            >
              <option value=""></option>
              <option value="female">{t("gender.female")}</option>
              <option value="male">{t("gender.male")}</option>
              <option value="other">{t("gender.other")}</option>
            </SelectField>
            {isGendered && pronouns != null && (
              <p className="mb-6">
                {t(`gender.example`, { gender: pronouns })}
              </p>
            )}
          </>
        )}

        <div className="flex gap-4 justify-end items-center mt-8">
          <CancelLink />
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </form>
    </ProfileFormLayout>
  );
}
