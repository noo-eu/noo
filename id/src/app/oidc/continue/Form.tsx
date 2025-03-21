"use client";

import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { consentFormSubmit } from "./actions";

export default function Form({ userId }: Readonly<{ userId: string }>) {
  const [_, formAction, pending] = useActionState(consentFormSubmit, {});
  const t = useTranslations("common");

  return (
    <div className="mt-8">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <div className="flex gap-4 justify-end">
          <Button
            type="submit"
            name="consent"
            disabled={pending}
            value={"yes"}
            data-testid="consentSubmit"
          >
            {t("continue")}
          </Button>
        </div>
      </form>
    </div>
  );
}
