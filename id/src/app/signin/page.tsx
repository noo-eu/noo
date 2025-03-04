"use client";

import { Button } from "@/components/Button";
import { Noo } from "@/components/Noo";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signin } from "./actions";

type State = {
  username?: string;
  error?: unknown;
};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signin, {} as State);
  const t = useTranslations("signin");

  const continueUrl = useSearchParams().get("continue");

  return (
    <>
      <h1 className="text-3xl text-center mb-8">
        {t.rich("title", { noo: () => <Noo /> })}
      </h1>

      {state.error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          {t("error")}
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

        <div className="flex justify-end mt-12">
          <Button type="submit" pending={pending} data-testid="signinSubmit">
            {t("submit")}
          </Button>
        </div>
      </form>
    </>
  );
}
