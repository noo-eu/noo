"use client";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signupStep2 } from "../actions";

type State = {
  values: {
    username: string;
  };
  errors: {
    username?: string;
  };
};

const initialState: State = {
  values: {
    username: "",
  },
  errors: {},
};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signupStep2,
    initialState,
  );

  const t = useTranslations("signup");
  const commonT = useTranslations("common");

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step2.title")}
      </h2>

      <form action={formAction} className="space-y-8">
        <TextField
          label={t("step2.username")}
          name="username"
          defaultValue={state.values.username}
          error={state.errors.username}
          suffix="@noomail.eu"
          autoComplete="username"
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
