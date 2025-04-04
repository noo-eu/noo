import { useLoaderData } from "react-router";
import { useTranslations } from "use-intl";
import { PageModal } from "~/components/PageModal";

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const error = new URLSearchParams(url.search).get("error")!;
  return { error };
}

export default function OidcFatalErrorPage() {
  const { error } = useLoaderData<typeof loader>();
  const t = useTranslations("oidc.fatal");

  return (
    <PageModal className="!max-w-lg">
      <PageModal.Modal className="max-w-lg mx-auto !block">
        <h1 className="text-xl font-medium mb-4">{t("title")}</h1>
        <p>{t("description")}</p>
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-4">
          {t("error", { error })}
        </pre>
      </PageModal.Modal>
    </PageModal>
  );
}
