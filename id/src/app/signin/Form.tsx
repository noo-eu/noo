"use client";

import { Button, PasswordField, TextField } from "@noo/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signin } from "./actions";

type State = {
  username?: string;
  error?: string;
  domain?: string;
};

export function Form() {
  const [state, formAction, pending] = useActionState(signin, {} as State);
  const t = useTranslations("signin");
  const continueUrl = useSearchParams().get("continue");

  return (
    <>
      {state.error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          {state.error == "credentials" && t("error")}
          {state.error == "tenant" &&
            t("tenant_error", { domain: state.domain! })}
        </div>
      )}
      <form action={formAction} className="space-y-8">
        <TextField
          label={t("username")}
          name="username"
          defaultValue={state.username}
        />
        <PasswordField label={t("password")} name="password" />
        {continueUrl && (
          <input type="hidden" name="continue" value={continueUrl} />
        )}
        <div className="flex justify-end items-center mt-12">
          <Link href="/signup" className="py-2.5 px-2 link font-medium me-4">
            {t("create_account")}
          </Link>
          <Button type="submit" pending={pending} data-testid="signinSubmit">
            {t("submit")}
          </Button>
        </div>
      </form>
    </>
  );
}
