"use client";

import { useAuth } from "@/auth/authContext";
import { Noo } from "@/components/Noo";
import ProfileLayout from "@/components/Profile/ProfileLayout";
import { ProfilePicture } from "@/components/ProfilePicture";
import {
  CakeIcon,
  ChatBubbleBottomCenterTextIcon,
  UserCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import { ProfileLink } from "./ProfileLink";
import { useProfilePictureDialog } from "./useProfilePictureDialog";
import { renderBirthdate, renderGender } from "./utils";

export default function ProfileHub() {
  const format = useFormatter();

  const t = useTranslations("profile");
  const user = useAuth();

  const { open: openPictureDialog, Dialog: PictureDialog } =
    useProfilePictureDialog();

  return (
    <ProfileLayout>
      <h1 className="text-4xl font-medium mt-12 mb-16 px-4 text-center">
        {t.rich("title", {
          noo: () => <Noo />,
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <button
          className="cursor-pointer dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          onClick={openPictureDialog}
        >
          <UserCircleIcon className="size-6" />
          <div>
            <h2 className="text-lg font-medium text-left">
              {t("summary.picture")}
            </h2>
          </div>
          <div className="ms-auto border border-black/50 dark:border-white border-2 rounded-full p-0.5">
            <ProfilePicture width={72} className="w-18 text-2xl" />
          </div>
        </button>
        <ProfileLink
          href={`/profile/name`}
          Icon={ChatBubbleBottomCenterTextIcon}
          title={t("summary.name")}
          value={user.fullName}
        />
        <ProfileLink
          href={`/profile/birthdate`}
          Icon={CakeIcon}
          title={t("summary.birthdate")}
          value={user.birthdate && renderBirthdate(user.birthdate, format)}
        />
        <ProfileLink
          href={`/profile/gender`}
          Icon={UserIcon}
          title={t("summary.gender")}
          value={renderGender(user, t)}
        />
      </div>

      <PictureDialog />
    </ProfileLayout>
  );
}
