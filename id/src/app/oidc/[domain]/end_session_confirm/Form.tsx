"use client";

import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";

export function Form({
  submitAction,
}: {
  submitAction: (data: FormData) => Promise<void>;
}) {
  const t = useTranslations("common");

  return (
    <form action={submitAction}>
      <div className="flex gap-4 justify-end">
        <Button type="submit" name="decision" value="yes">
          {t("yes")}
        </Button>
        <Button type="submit" name="decision" value="no" kind="secondary">
          {t("no")}
        </Button>
      </div>
    </form>
  );
}
