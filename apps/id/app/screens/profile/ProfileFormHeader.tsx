import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Noo } from "@noo/ui";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";

export function ProfileFormHeader() {
  const user = useAuth();
  const t = useTranslations("profile");

  return (
    <div className="text-lg mx-4 mb-2 flex items-center">
      <Link to={`/profile?uid=${user.id}`} aria-label={t("back")}>
        <ArrowLeftIcon className="size-6 inline-block me-2" />
      </Link>
      <h1>
        {t.rich("header", {
          noo: () => <Noo />,
        })}
      </h1>
    </div>
  );
}
