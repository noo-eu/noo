"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import {
  CakeIcon,
  ChatBubbleBottomCenterTextIcon,
  UserCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { ProfilePicture } from "@/components/ProfilePicture";
import { Noo } from "@/components/Noo";
import { ProfilePageProps } from "@/components/Profile";
import { useFormatter, useTranslations } from "next-intl";

const PictureDialog = dynamic(
  () => import("@/components/Profile/PictureDialog"),
  {
    ssr: false,
  },
);

export default function ProfilePage({ user }: ProfilePageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const format = useFormatter();

  const t = useTranslations("profile");

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl font-medium mb-16">
        {t.rich("title", {
          noo: () => <Noo />,
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <button
          className="cursor-pointer dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          onClick={() => setIsOpen(true)}
        >
          <UserCircleIcon className="size-6" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.picture")}</h2>
          </div>
          <div className="ml-auto border border-black/50 border-2 rounded-full p-0.5">
            <ProfilePicture user={user} width={72} className="w-18 text-2xl" />
            <PictureDialog
              isOpen={isOpen}
              close={() => setIsOpen(false)}
              user={user}
            />
          </div>
        </button>
        <Link
          className="dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/profile/name?uid=${user.id}`}
        >
          <ChatBubbleBottomCenterTextIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.name")}</h2>

            <p>
              {user.firstName} {user.lastName}
            </p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/profile/birthdate?uid=${user.id}`}
        >
          <CakeIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.birthdate")}</h2>

            <p>
              {format.dateTime(user.birthdate!, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href={`/profile/gender?uid=${user.id}`}
        >
          <UserIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("summary.gender")}</h2>

            <p>
              {user.gender === "custom" && user.genderCustom}
              {user.gender === "male" && t("gender.male")}
              {user.gender === "female" && t("gender.female")}
              {user.gender === "not_specified" && (
                <i>{t("summary.unspecifiedGender")}</i>
              )}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
