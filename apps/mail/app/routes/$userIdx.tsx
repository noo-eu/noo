import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { useTranslations } from "use-intl";
import { loadUserSession } from "~/utils";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await loadUserSession(request, params);
  if (!session) {
    throw redirect("/auth/start");
  }

  return session;
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();
  const t = useTranslations("home");

  return (
    <div className="max-w-2xl mx-auto text-center py-6">
      <h1 className="text-3xl font-bold">
        {t("welcome", { name: user.firstName })}
      </h1>
    </div>
  );
}
