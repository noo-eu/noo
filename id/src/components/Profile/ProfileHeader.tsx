import { useTranslations } from "next-intl";
import { Noo } from "../Noo";
import { ProfilePicture, ProfilePictureProps } from "../ProfilePicture";

export type ProfileHeaderProps = {
  user: ProfilePictureProps["user"];
};

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const t = useTranslations("profile");

  return (
    <div className="max-w-3xl flex items-center justify-between border-b border-white/25 w-full px-6 py-3 bg-gray-100 dark:bg-black">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-medium">
          <a href="/" className="hover:underline">
            <Noo className="text-eu-blue dark:text-white" />{" "}
            <span className="tracking-wider">{t("pageTitle")}</span>
          </a>
        </h1>
      </div>
      <div className="flex items-center gap-4 flex items-center justify-center border rounded-full p-0.75">
        <a href="/profile">
          <ProfilePicture user={user} width={32} />
        </a>
      </div>
    </div>
  );
}
