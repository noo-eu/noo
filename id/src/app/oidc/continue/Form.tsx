"use client";

import { useActionState } from "react";
import { consentFormSubmit } from "./actions";
import { Button } from "@/components/Button";
import { useTranslations } from "next-intl";

export default function Form({ sessionId }: { sessionId: string }) {
  const [_, formAction, pending] = useActionState(consentFormSubmit, {});
  const t = useTranslations("common");

  return (
    <div className="mt-8">
      <form action={formAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <div className="flex gap-4 justify-end">
          <Button
            type="submit"
            name="consent"
            disabled={pending}
            value={"no"}
            kind="secondary"
          >
            {t("cancel")}
          </Button>
          <Button type="submit" name="consent" disabled={pending} value={"yes"}>
            {t("continue")}
          </Button>
        </div>
      </form>
    </div>
  );
}
