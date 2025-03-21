"use client";

import { useAuth } from "@/auth/authContext";
import { Noo } from "@/components/Noo";
import ProfileLayout from "@/components/Profile/ProfileLayout";
import {
  ArrowLeftEndOnRectangleIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  QrCodeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import { ProfileLink } from "../profile/ProfileLink";

type SecurityHomePageProps = {
  activeSessions: number;
};

export default function SecurityHub({
  activeSessions,
}: Readonly<SecurityHomePageProps>) {
  const format = useFormatter();

  const t = useTranslations("security");
  const user = useAuth();

  return (
    <ProfileLayout>
      <h1 className="text-4xl font-medium mt-12 mb-16">
        {t.rich("title", {
          noo: () => <Noo />,
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <ProfileLink
          href={`/security/password`}
          Icon={ArrowLeftEndOnRectangleIcon}
          title={t("summary.password")}
        >
          {user.passwordBreaches !== null && user.passwordBreaches > 0 && (
            <ExclamationTriangleIcon
              className="size-6 inline-block ms-auto text-amber-600 absolute top-5 end-4"
              title={t("summary.breaches", {
                count: format.number(user.passwordBreaches),
              })}
            />
          )}

          <div className="text-sm text-gray-500">
            {t("summary.passwordLastChanged", {
              date: user.passwordChangedAt!,
            })}
          </div>
        </ProfileLink>
        <ProfileLink
          href={`/security/mfa`}
          Icon={QrCodeIcon}
          title={t("summary.mfa")}
        >
          <span className="bg-black/10 dark:bg-white/10 text-sm mt-2 px-2 py-1 rounded-full text-black dark:text-white">
            {t("summary.comingSoon")}
          </span>
        </ProfileLink>
        <ProfileLink
          href={`/security/passkeys?uid=${user.id}`}
          Icon={KeyIcon}
          title={t("summary.passkeys")}
        />
        <ProfileLink
          href={`/security/sessions?uid=${user.id}`}
          Icon={UserCircleIcon}
          title={t("summary.sessions")}
        >
          {t("summary.activeSessions", {
            count: format.number(activeSessions),
          })}
        </ProfileLink>
        <ProfileLink
          href={`/security/applications?uid=${user.id}`}
          Icon={CircleStackIcon}
          title={t("summary.applications")}
        >
          <span className="bg-black/10 dark:bg-white/10 text-sm mt-2 px-2 py-1 rounded-full text-black dark:text-white">
            {t("summary.comingSoon")}
          </span>
        </ProfileLink>
      </div>
    </ProfileLayout>
  );
}
