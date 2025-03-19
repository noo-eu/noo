"use client";

import { Noo } from "@/components/Noo";
import ProfileLayout from "@/components/Profile/ProfileLayout";
import { useAuth } from "@/lib/authContext";
import {
  ArrowLeftEndOnRectangleIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  QrCodeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

type SecurityHomePageProps = {
  activeSessions: number;
};

export default function SecurityHomePage({
  activeSessions,
}: SecurityHomePageProps) {
  const format = useFormatter();

  const t = useTranslations("security");
  const user = useAuth();

  return (
    <ProfileLayout user={user}>
      <h1 className="text-4xl font-medium mt-12 mb-16">
        {t.rich("title", {
          noo: () => <Noo />,
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/security/password?uid=${user.id}`}
        >
          <ArrowLeftEndOnRectangleIcon className="size-6 self-start mt-0.5" />
          <div className="w-full">
            <h2 className="text-lg font-medium flex flex-row justify-between items-center">
              <div>{t("summary.password")}</div>
              {user.passwordBreaches !== null && user.passwordBreaches > 0 && (
                <ExclamationTriangleIcon
                  className="size-6 inline-block ms-auto text-amber-600"
                  title={t("summary.breaches", {
                    count: format.number(user.passwordBreaches),
                  })}
                />
              )}
            </h2>

            <div className="text-sm text-gray-500">
              {t("summary.passwordLastChanged", {
                date: user.passwordChangedAt!,
              })}
            </div>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/security/mfa?uid=${user.id}`}
        >
          <QrCodeIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.mfa")}</h2>

            <p>
              <span className="bg-black/10 dark:bg-white/10 text-sm mt-2 px-2 py-1 rounded-full text-black dark:text-white">
                {t("summary.comingSoon")}
              </span>
            </p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/security/passkeys?uid=${user.id}`}
        >
          <KeyIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.passkeys")}</h2>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/security/sessions?uid=${user.id}`}
        >
          <UserCircleIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.sessions")}</h2>

            <p>
              {t("summary.activeSessions", {
                count: format.number(activeSessions),
              })}
            </p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/security/applications?uid=${user.id}`}
        >
          <CircleStackIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.applications")}</h2>

            <span className="bg-black/10 dark:bg-white/10 text-sm mt-2 px-2 py-1 rounded-full text-black dark:text-white">
              {t("summary.comingSoon")}
            </span>
          </div>
        </Link>
      </div>
    </ProfileLayout>
  );
}
