"use client";

import { useAuth } from "@/auth/authContext";
import { Noo } from "@/components/Noo";
import ProfileLayout from "@/components/Profile/ProfileLayout";
import { ClockIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { ProfileLink } from "../profile/ProfileLink";
import { displayTz } from "@/lib/timeZones";
import { LANGUAGE_NAMES } from "@/i18n";

export function SettingsHub() {
  const t = useTranslations("settings");
  const user = useAuth();

  const tzT = useTranslations("settings.timeZone");

  return (
    <ProfileLayout>
      <h1 className="text-4xl font-medium mt-12 mb-16">
        {t.rich("title", {
          noo: () => <Noo />,
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <ProfileLink
          href={`/settings/language`}
          Icon={LanguageIcon}
          title={t("summary.language")}
        >
          <div className="text-sm text-gray-500">
            {LANGUAGE_NAMES[user.locale]}
          </div>
        </ProfileLink>
        <ProfileLink
          href={`/settings/time-zone`}
          Icon={ClockIcon}
          title={t("summary.timeZone")}
        >
          <div className="text-sm text-gray-500">
            {displayTz(tzT, user.timeZone)}
          </div>
        </ProfileLink>
      </div>
    </ProfileLayout>
  );
}
