"use client";

import { Button, TextField, SelectField } from "@noo/ui";
import { useActionState, useEffect, useState } from "react";
import { updateGender } from "../actions";
import { redirect } from "next/navigation";
import toast from "react-hot-toast";
import { PageModal } from "@/components/PageModal";
import Link from "next/link";
import { Noo } from "@/components/Noo";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { User } from "@/db/users";

type Props = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    birthdate: Date | null;
    gender: User["gender"];
    genderCustom: string | null;
    pronouns: User["pronouns"];
  };
};

export function Form({ user }: Props) {
  const [state, action, isPending] = useActionState(
    updateGender.bind(null, user.id),
    {
      data: { success: false },
      input: {
        gender: user.gender,
        genderCustom: user.genderCustom || "",
        pronouns: user.pronouns,
      },
    },
  );

  const t = useTranslations("profile");
  const commonT = useTranslations("common");
  const locale = useLocale();

  // Some languages are not gendered
  const isGendered = !["et", "fi", "hu", "tr"].includes(locale);

  const [gender, setGender] = useState<string>(user.gender);
  const [pronouns, setPronouns] = useState<string | null>(null);

  useEffect(() => {
    if (state.data?.success) {
      // Redirect to the profile page
      toast.success(t("gender.updateSuccess"));
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
            <h1 className="text-2xl mb-4">{t("gender.title")}</h1>

            <p className="mb-4 text-sm">
              {t.rich("gender.description", {
                noo: () => <Noo />,
              })}
            </p>

            <form action={action} className="space-y-4">
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
