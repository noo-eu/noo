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
  const profileT = useTranslations("profile");
  const commonT = useTranslations("common");

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step1.title")}
      </h2>

      <form action={formAction} className="space-y-8">
        <TextField
          label={profileT("name.firstName")}
          name="first_name"
          defaultValue={state.values.first_name}
          error={state.errors.firstName}
          autoCapitalize="words"
        />

        <TextField
          label={profileT("name.lastName")}
          aroundLabel={(label) => (
            <div className="flex justify-between mb-1">
              {label}
              <span className="text-gray-500">{commonT("optional")}</span>
            </div>
          )}
          name="last_name"
          defaultValue={state.values.last_name}
          error={state.errors.lastName}
          autoCapitalize="words"
        />

        <div className="very-important-field">
          <label>Favorite color</label>
          <input type="text" name="favorite_color" />
        </div>

        <div className="flex justify-end mt-12">
          <Button type="submit" pending={pending}>
            {commonT("next")}
          </Button>
        </div>
      </form>
    </>
  );
}
