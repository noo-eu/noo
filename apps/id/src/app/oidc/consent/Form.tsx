"use client";

import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { consentFormSubmit } from "./actions";

export default function Form() {
  const [_, formAction, pending] = useActionState(consentFormSubmit, {});

  const userId = useSearchParams().get("uid")!;
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
