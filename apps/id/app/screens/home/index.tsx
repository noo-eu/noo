import {
  Cog6ToothIcon,
  LockClosedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { ProfilePicture } from "~/components/ProfilePicture";
import ProfileLayout from "./ProfileLayout";

import { useProfilePictureDialog } from "../profile/useProfilePictureDialog";

export function ProfilePage() {
  const t = useTranslations("profile.home");

  const user = useAuth();

  const { open: openPictureDialog, Dialog: PictureDialog } =
    useProfilePictureDialog();

  return (
    <ProfileLayout>
      <button className="mt-16 mb-8 rounded-full" onClick={openPictureDialog}>
        <div className="flex items-center justify-center border border-2 rounded-full p-0.75">
          <ProfilePicture
            className="w-32 h-32 text-5xl cursor-pointer hover:opacity-80"
            width={128}
          />
        </div>
        <PictureDialog />
      </button>

      <h1 className="text-5xl font-medium my-8 px-4 text-center">
        {t("title", {
          name: user.firstName,
        })}
      </h1>

      <div className="space-y-4 w-full max-w-lg p-4">
        <Link
          className="transition-all transition-100 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          to={`/profile?uid=${user.id}`}
        >
          <UserCircleIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("profile")}</h2>

            <p>{t("profileDescription")}</p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          to={`/security?uid=${user.id}`}
        >
          <LockClosedIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("security")}</h2>

            <p>{t("securityDescription")}</p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          to={`/settings?uid=${user.id}`}
        >
          <Cog6ToothIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">{t("settings")}</h2>

            <p>{t("settingsDescription")}</p>
          </div>
        </Link>
      </div>
    </ProfileLayout>
  );
}
