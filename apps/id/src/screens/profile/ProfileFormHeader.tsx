import { useAuth } from "@/auth/authContext";
import { Noo } from "@/components/Noo";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import Link from "next/link";

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
