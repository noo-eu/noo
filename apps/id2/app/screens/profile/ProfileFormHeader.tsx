import { useAuth } from "@/auth/authContext";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { Noo } from "~/components/Noo";

export function ProfileFormHeader() {
  const user = useAuth();
  const t = useTranslations("profile");

  return (
    <div className="text-lg mx-4 mb-2 flex items-center">
      <Link href={`/profile?uid=${user.id}`} aria-label={t("back")}>
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
