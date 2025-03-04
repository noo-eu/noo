"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "use-intl";

export default function OidcFatalErrorPage() {
  const query = useSearchParams();
  const t = useTranslations("oidc.fatal");

  return (
    <>
      <h1 className="text-xl font-medium mb-4">{t("title")}</h1>
      <p>
        {t("description")}
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-4">
          {t("error", { error: query.get("error") })}
        </pre>
      </p>
    </>
  );
}
