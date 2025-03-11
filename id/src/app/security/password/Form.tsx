"use client";

import { Noo } from "@/components/Noo";
import { PageModal } from "@/components/PageModal";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { Button, PasswordField } from "@noo/ui";
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { updatePassword } from "../actions";
import { PasswordRater } from "./PasswordRater";

type Props = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    passwordChangedAt: Date | null;
    passwordBreaches: number | null;
    username: string;
    normalizedUsername: string;
    tenantDomain?: string;
    birthdate?: string;
    hasOtp: boolean;
  };
};

export function Form({ user }: Props) {
  useEffect(() => {
    const options = {
      translations: zxcvbnEnPackage.translations,
      graphs: zxcvbnCommonPackage.adjacencyGraphs,
      dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
        // TODO: load locale-specific dictionary
        userInputs: [
          "noo",
          "noomail",
          "noo.eu",
          ...user.firstName.split(" "),
          ...(user.lastName?.split(" ") ?? []),
          user.normalizedUsername,
          user.username,
          user.tenantDomain ?? "",
          user.birthdate ?? "",
        ],
      },
      useLevenshteinDistance: true,
    };

    zxcvbnOptions.setOptions(options);
  }, [
    user.normalizedUsername,
    user.username,
    user.tenantDomain,
    user.birthdate,
  ]);

  const [state, action, isPending] = useActionState(
    updatePassword.bind(null, user.id),
    {
      data: { success: false },
      input: { "new-password": "", "new-password-confirmation": "" },
    },
  );

  const t = useTranslations("security");
  const commonT = useTranslations("common");
  const format = useFormatter();

  useEffect(() => {
    if (state.data?.success) {
      // Redirect to the profile page
      toast.success(t("password.updateSuccess"));
      redirect(`/?uid=${user.id}`);
    }
  }, [state.data, t, user.id]);

  const [password, setPassword] = useState<string>("");
  const [strength, setStrength] = useState<number>(0);

  useEffect(() => {
    zxcvbnAsync(password).then((result) => {
      setStrength(result.score);
    });
  }, [password]);

  return (
    <div className="max-w-xl w-full p-4 mx-auto">
      <PageModal footer={false}>
        <div className="text-lg mx-4 mb-2 flex items-center">
          <Link href={`/security?uid=${user.id}`} aria-label={t("back")}>
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
            <h1 className="text-2xl mb-4">{t("password.title")}</h1>

            {user.passwordBreaches !== null && user.passwordBreaches > 0 && (
              <p className="mb-4 text-sm text-amber-600 border border-amber-600 p-3 rounded-md">
                {t.rich("password.breaches", {
                  count: format.number(user.passwordBreaches),
                  otp: user.hasOtp,
                  guide: (children) => (
                    <Link className="link" href={`https://help.noo.eu/`}>
                      {children}
                    </Link>
                  ),
                })}
              </p>
            )}

            <p className="mb-4 text-sm">{t("password.description1")}</p>

            <p className="mb-4 text-sm">{t("password.description2")}</p>

            <form action={action}>
              <PasswordField
                label={t("password.label")}
                name="new-password"
                defaultValue={state.input["new-password"]}
                error={
                  state.error?.["new-password"] &&
                  t(`password.errors.${state.error["new-password"]}`)
                }
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
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
                  state.error?.["new-password-confirmation"] &&
                  t(
                    `password.errors.${state.error["new-password-confirmation"]}`,
                  )
                }
                autoComplete="new-password"
              />

              <p className="text-sm mt-4">{t("password.updateNotice")}</p>

              <div className="mt-8 flex gap-4 justify-end items-center">
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
