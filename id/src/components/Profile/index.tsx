"use client";

import { User } from "@/db/users";
import {
  Cog6ToothIcon,
  LockClosedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ProfilePicture } from "../ProfilePicture";

export type ProfilePageProps = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    picture: string | null;
    birthdate: Date | null;
    gender: User["gender"];
    genderCustom: string | null;
    pronouns: User["pronouns"];
  };
};

const PictureDialog = dynamic(() => import("./PictureDialog"), {
  ssr: false,
});

export function ProfilePage({ user }: ProfilePageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("profile.home");

  return (
    <div className="flex flex-col items-center">
      <div className="mt-16 mb-8" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-center border border-2 rounded-full p-0.75">
          <ProfilePicture
            user={user}
            className="w-32 h-32 text-5xl cursor-pointer hover:opacity-80"
            width={128}
          />
        </div>
        <PictureDialog
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          user={user}
        />
      </div>
      <h1 className="text-5xl font-medium my-8">
        {t.rich("title", {
          name: user.firstName,
          bold: (children) => (
            <span style={{ fontFamily: "DynaPuff" }}>{children}</span>
          ),
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <Link
          className="transition-all transition-100 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href="/profile"
        >
          <UserCircleIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("profile")}</h2>

            <p>{t("profileDescription")}</p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href="/security"
        >
          <LockClosedIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("security")}</h2>

            <p>{t("securityDescription")}</p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href="/settings"
        >
          <Cog6ToothIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("settings")}</h2>

            <p>{t("settingsDescription")}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
