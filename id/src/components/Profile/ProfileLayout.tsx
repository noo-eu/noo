import { ProfileHeader, ProfileHeaderProps } from "./ProfileHeader";

type Props = {
  children: React.ReactNode;
  user: ProfileHeaderProps["user"];
};

export default function ProfileLayout({ user, children }: Props) {
  return (
    <div className="flex flex-col items-center">
      <ProfileHeader user={user} />

      {children}
    </div>
  );
}
