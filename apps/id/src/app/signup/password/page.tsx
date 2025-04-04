"use client";

import { Button, PasswordField } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signupStep3 } from "../actions";

type State = {
  values: {
    password: string;
  };
  errors: {
    password?: string;
  };
};

const initialState: State = {
  values: {
    password: "",
  },
  errors: {},
};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signupStep3,
    initialState,
  );

  const t = useTranslations("signup");
  const commonT = useTranslations("common");
  const passwordT = useTranslations("common.passwordField");

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step3.title")}
      </h2>

      <form action={formAction} className="space-y-8">
        <PasswordField
          label={t("step3.password")}
          name="password"
          defaultValue={state.values.password}
          error={state.errors.password}
          autoComplete="new-password"
          t={passwordT}
          autoFocus
        />

        <div className="flex justify-end mt-12">
          <Button type="submit" pending={pending}>
            {commonT("next")}
          </Button>
        </div>
      </form>
    </>
  );
}
