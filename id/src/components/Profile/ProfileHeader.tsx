import { useTranslations } from "next-intl";
import Link from "next/link";
import { Noo } from "../Noo";
import { ProfilePicture } from "../ProfilePicture";

export function ProfileHeader() {
  const t = useTranslations("profile");

  return (
    <div className="max-w-3xl flex items-center justify-between border-b border-black/15 dark:border-white/25 w-full px-6 py-3 dark:bg-black">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-medium whitespace-nowrap">
          <Link href="/" className="hover:underline">
            <Noo className="text-eu-blue dark:text-white" />{" "}
            <span className="tracking-wide">{t("pageTitle")}</span>
          </Link>
        </h1>
      </div>
      <div className="flex items-center gap-4 flex items-center justify-center border rounded-full p-0.5">
        <a href="/profile">
          <ProfilePicture className="size-[32px]" width={32} />
        </a>
      </div>
    </div>
  );
}
