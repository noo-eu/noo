"use client";

import { Button, TextField } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signupStep1 } from "./actions";

type State = {
  values: {
    first_name: string;
    last_name: string;
  };
  errors: {
    first_name?: string;
    last_name?: string;
  };
};

const initialState: State = {
  values: {
    first_name: "",
    last_name: "",
  },
  errors: {},
};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signupStep1,
    initialState,
  );

  const t = useTranslations("signup");
  const commonT = useTranslations("common");

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step1.title")}
      </h2>

      <form action={formAction} className="space-y-8">
        <TextField
          label={t("step1.first_name")}
          name="first_name"
          defaultValue={state.values.first_name}
          error={state.errors.first_name}
          autoCapitalize="words"
        />

        <TextField
          label={t("step1.last_name")}
          aroundLabel={(label) => (
            <div className="flex justify-between mb-1">
              {label}
              <span className="text-gray-500">{commonT("optional")}</span>
            </div>
          )}
          name="last_name"
          defaultValue={state.values.last_name}
          error={state.errors.last_name}
          autoCapitalize="words"
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
